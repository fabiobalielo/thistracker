import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";

// Google API endpoints
const GOOGLE_APIS = {
  calendar: "https://www.googleapis.com/calendar/v3",
  drive: "https://www.googleapis.com/drive/v3",
  docs: "https://docs.googleapis.com/v1",
  sheets: "https://sheets.googleapis.com/v4",
} as const;

// Helper function to get access token from session
export async function getGoogleAccessToken() {
  try {
    const session = await getServerSession(authOptions);
    console.log("Session data:", {
      hasSession: !!session,
      hasAccessToken: !!(session as { accessToken?: string })?.accessToken,
      hasError: !!(session as { error?: string })?.error,
      sessionKeys: session ? Object.keys(session) : [],
    });

    if (!session) {
      throw new Error("No active session found. Please sign in.");
    }

    const accessToken = (session as { accessToken?: string })?.accessToken;
    const error = (session as { error?: string })?.error;

    if (error) {
      throw new Error(`Session error: ${error}. Please sign in again.`);
    }

    if (!accessToken) {
      throw new Error(
        "No access token found in session. Please sign in again to refresh permissions."
      );
    }

    console.log("Access token retrieved successfully");
    return accessToken;
  } catch (error) {
    console.error("Error getting Google access token:", error);
    throw error;
  }
}

// Google Calendar API helpers
export class GoogleCalendarAPI {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getCalendars() {
    const response = await fetch(
      `${GOOGLE_APIS.calendar}/users/me/calendarList`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );
    return response.json();
  }

  async createEvent(calendarId: string, event: unknown) {
    const response = await fetch(
      `${GOOGLE_APIS.calendar}/calendars/${calendarId}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );
    return response.json();
  }

  async getEvents(calendarId: string, timeMin?: string, timeMax?: string) {
    const params = new URLSearchParams();
    if (timeMin) params.append("timeMin", timeMin);
    if (timeMax) params.append("timeMax", timeMax);

    const response = await fetch(
      `${GOOGLE_APIS.calendar}/calendars/${calendarId}/events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );
    return response.json();
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

// Google Docs API helpers
export class GoogleDocsAPI {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async createDocument(title: string) {
    const response = await fetch(`${GOOGLE_APIS.docs}/documents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
      }),
    });
    return response.json();
  }

  async getDocument(documentId: string) {
    const response = await fetch(
      `${GOOGLE_APIS.docs}/documents/${documentId}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );
    return response.json();
  }

  async updateDocument(documentId: string, requests: unknown[]) {
    const response = await fetch(
      `${GOOGLE_APIS.docs}/documents/${documentId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests,
        }),
      }
    );
    return response.json();
  }
}

// Google Sheets API helpers
export class GoogleSheetsAPI {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async createSpreadsheet(title: string) {
    const response = await fetch(`${GOOGLE_APIS.sheets}/spreadsheets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
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
    console.log(`Fetching spreadsheet metadata for ID: ${spreadsheetId}`);

    const response = await fetch(
      `${GOOGLE_APIS.sheets}/spreadsheets/${spreadsheetId}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
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

  async updateSheet(
    spreadsheetId: string,
    range: string,
    values: unknown[][],
    sheetName?: string
  ) {
    console.log(
      `Updating sheet ${spreadsheetId}, range: ${range}, values: ${values.length} rows`
    );

    const response = await fetch(
      `${GOOGLE_APIS.sheets}/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
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
      `Fetching sheet values for spreadsheet ${spreadsheetId}, range: ${range}`
    );

    const response = await fetch(
      `${GOOGLE_APIS.sheets}/spreadsheets/${spreadsheetId}/values/${range}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
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
      `Performing batch update on spreadsheet ${spreadsheetId} with ${requests.length} requests`
    );

    const response = await fetch(
      `${GOOGLE_APIS.sheets}/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
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
    calendar: new GoogleCalendarAPI(accessToken),
    drive: new GoogleDriveAPI(accessToken),
    docs: new GoogleDocsAPI(accessToken),
    sheets: new GoogleSheetsAPI(accessToken),
  };
}
