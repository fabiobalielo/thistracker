import { NextRequest, NextResponse } from "next/server";
import { createGoogleAPIs } from "@/lib/google-apis";
import { DataService } from "@/lib/data-service";

let dataService: DataService | null = null;

async function getDataService() {
  if (!dataService) {
    const apis = await createGoogleAPIs();
    dataService = new DataService(apis.sheets, apis.drive);
    await dataService.initialize();
  }
  return dataService;
}

export async function GET(request: NextRequest) {
  try {
    const service = await getDataService();
    const response = await service.getClients();

    if (!response.success) {
      return NextResponse.json({ error: response.error }, { status: 500 });
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error fetching clients:", error);

    // Check if it's an authentication error
    if (error instanceof Error && error.message.includes("access token")) {
      return NextResponse.json(
        {
          error: "Authentication required. Please sign in to access your data.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const service = await getDataService();
    const response = await service.createClient(data);

    if (!response.success) {
      return NextResponse.json({ error: response.error }, { status: 400 });
    }

    return NextResponse.json(response.data, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);

    // Check if it's an authentication error
    if (error instanceof Error && error.message.includes("access token")) {
      return NextResponse.json(
        {
          error: "Authentication required. Please sign in to access your data.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    // Check if it's a Google Sheets API error
    if (
      error instanceof Error &&
      error.message.includes("Google Sheets API error")
    ) {
      return NextResponse.json(
        {
          error:
            "Google Sheets API error. Please check your permissions and try again.",
          code: "GOOGLE_API_ERROR",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create client",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
