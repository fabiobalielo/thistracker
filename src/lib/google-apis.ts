import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";

// Google API endpoints
const GOOGLE_APIS = {
  drive: "https://www.googleapis.com/drive/v3",
  sheets: "https://sheets.googleapis.com/v4",
} as const;

// Rate limiting utility
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 50, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();

    // Remove requests older than the window
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    // If we're at the limit, wait
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest) + 100; // Add 100ms buffer
      console.log(`Rate limit reached, waiting ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    // Record this request
    this.requests.push(now);
  }
}

// Global rate limiter for Google Sheets API
const sheetsRateLimiter = new RateLimiter(50, 60000); // 50 requests per minute

// Note: Using drive.file scope means we can only access files created by this app
// This is perfect for privacy - users only grant access to files we create

// Helper function to get access token from session
export async function getGoogleAccessToken() {
  try {
    const session = await getServerSession(authOptions);
    console.log("Session data:", {
      hasSession: !!session,
      hasAccessToken: !!(session as { accessToken?: string })?.accessToken,
      hasError: !!(session as { error?: string })?.error,
      sessionKeys: session ? Object.keys(session) : [],
      userEmail: (session as { user?: { email?: string } })?.user?.email,
    });

    if (!session) {
      throw new Error("No active session found. Please sign in.");
    }

    const accessToken = (session as { accessToken?: string })?.accessToken;
    const error = (session as { error?: string })?.error;
    const userEmail = (session as { user?: { email?: string } })?.user?.email;

    if (error) {
      throw new Error(`Session error: ${error}. Please sign in again.`);
    }

    if (!accessToken) {
      throw new Error(
        "No access token found in session. Please sign in again to refresh permissions."
      );
    }

    if (!userEmail) {
      throw new Error("No user email found in session. Please sign in again.");
    }

    console.log(`Access token retrieved successfully for user: ${userEmail}`);
    return accessToken;
  } catch (error) {
    console.error("Error getting Google access token:", error);
    throw error;
  }
}

// Google Drive API helpers
export class GoogleDriveAPI {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getFiles(query?: string) {
    const params = new URLSearchParams();
    if (query) params.append("q", query);
    params.append("fields", "files(id,name,mimeType,createdTime,modifiedTime)");

    const response = await fetch(`${GOOGLE_APIS.drive}/files?${params}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
    return response.json();
  }

  async searchFiles(query: string) {
    const params = new URLSearchParams();
    // With drive.file scope, we can only access files created by this app
    // So we don't need the 'me' in owners filter - all files are already user-scoped
    params.append("q", query);
    params.append("fields", "files(id,name,mimeType,createdTime,modifiedTime)");

    const response = await fetch(`${GOOGLE_APIS.drive}/files?${params}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
    return response.json();
  }

  async createFile(name: string, mimeType: string, content?: string) {
    const response = await fetch(`${GOOGLE_APIS.drive}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        mimeType,
        ...(content && { content }),
      }),
    });
    return response.json();
  }

  async getFile(fileId: string) {
    const response = await fetch(`${GOOGLE_APIS.drive}/files/${fileId}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
    return response.json();
  }
}

// Google Sheets API helpers
export class GoogleSheetsAPI {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  // Helper method to ensure all API calls include proper user scoping
  private getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  // Validate that the spreadsheet belongs to the current user
  async validateSpreadsheetOwnership(spreadsheetId: string): Promise<boolean> {
    try {
      console.log(
        `Validating ownership of spreadsheet ${spreadsheetId} for current user`
      );
      const response = await fetch(
        `${GOOGLE_APIS.sheets}/spreadsheets/${spreadsheetId}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        console.log(
          `Spreadsheet ${spreadsheetId} not accessible to current user`
        );
        return false;
      }

      const spreadsheet = await response.json();
      console.log(
        `Spreadsheet ${spreadsheetId} is accessible to current user: ${spreadsheet.properties?.title}`
      );
      return true;
    } catch (error) {
      console.error(`Error validating spreadsheet ownership: ${error}`);
      return false;
    }
  }

  async createSpreadsheet(title: string) {
    console.log(`Creating spreadsheet "${title}" for authenticated user`);
    const response = await fetch(`${GOOGLE_APIS.sheets}/spreadsheets`, {
      method: "POST",
      headers: {
        ...this.getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          title,
        },
      }),
    });
    return response.json();
  }

  async getSpreadsheet(spreadsheetId: string) {
    console.log(
      `Fetching spreadsheet metadata for ID: ${spreadsheetId} (user-scoped)`
    );

    // Apply rate limiting
    await sheetsRateLimiter.waitIfNeeded();

    const response = await fetch(
      `${GOOGLE_APIS.sheets}/spreadsheets/${spreadsheetId}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    console.log(
      `Google Sheets API response status: ${response.status} ${response.statusText}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Google Sheets API error: ${response.status} ${response.statusText}`,
        errorText
      );
      throw new Error(
        `Google Sheets API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log(`Google Sheets API response:`, {
      spreadsheetId: result.spreadsheetId,
      title: result.properties?.title,
      sheetCount: result.sheets?.length || 0,
    });

    return result;
  }

  async updateSheet(spreadsheetId: string, range: string, values: unknown[][]) {
    console.log(
      `Updating sheet ${spreadsheetId}, range: ${range}, values: ${values.length} rows (user-scoped)`
    );

    // Apply rate limiting
    await sheetsRateLimiter.waitIfNeeded();

    const response = await fetch(
      `${GOOGLE_APIS.sheets}/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          ...this.getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Google Sheets API error: ${response.status} ${response.statusText}`,
        errorText
      );
      throw new Error(
        `Google Sheets API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log(`Google Sheets update successful:`, result);
    return result;
  }

  async getSheetValues(spreadsheetId: string, range: string) {
    console.log(
      `Fetching sheet values for spreadsheet ${spreadsheetId}, range: ${range} (user-scoped)`
    );

    // Apply rate limiting
    await sheetsRateLimiter.waitIfNeeded();

    const response = await fetch(
      `${GOOGLE_APIS.sheets}/spreadsheets/${spreadsheetId}/values/${range}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    console.log(
      `Google Sheets API response status: ${response.status} ${response.statusText}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Google Sheets API error: ${response.status} ${response.statusText}`,
        errorText
      );
      throw new Error(
        `Google Sheets API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log(`Google Sheets API response:`, {
      hasValues: !!result.values,
      rowCount: result.values ? result.values.length : 0,
      range: result.range,
      majorDimension: result.majorDimension,
    });

    return result;
  }

  async batchUpdate(spreadsheetId: string, requests: unknown[]) {
    console.log(
      `Performing batch update on spreadsheet ${spreadsheetId} with ${requests.length} requests (user-scoped)`
    );

    // Apply rate limiting
    await sheetsRateLimiter.waitIfNeeded();

    const response = await fetch(
      `${GOOGLE_APIS.sheets}/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          ...this.getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests,
        }),
      }
    );

    console.log(
      `Google Sheets API response status: ${response.status} ${response.statusText}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Google Sheets API error: ${response.status} ${response.statusText}`,
        errorText
      );
      throw new Error(
        `Google Sheets API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log(`Google Sheets batch update successful:`, {
      repliesCount: result.replies?.length || 0,
      spreadsheetId: result.spreadsheetId,
    });

    return result;
  }
}

// Factory function to create API instances
export async function createGoogleAPIs() {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    throw new Error("No access token available");
  }

  return {
    drive: new GoogleDriveAPI(accessToken),
    sheets: new GoogleSheetsAPI(accessToken),
  };
}
