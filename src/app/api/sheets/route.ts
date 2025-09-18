import { NextRequest, NextResponse } from "next/server";
import { createDataService } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    const service = await createDataService();

    switch (action) {
      case "info":
        const infoResponse = await service.getSpreadsheetInfo();
        if (!infoResponse.success) {
          return NextResponse.json(
            { error: infoResponse.error },
            { status: 500 }
          );
        }
        return NextResponse.json(infoResponse.data);

      case "verify":
        const verifyResponse = await service.verifyIntegrity();
        if (!verifyResponse.success) {
          return NextResponse.json(
            { error: verifyResponse.error },
            { status: 500 }
          );
        }
        return NextResponse.json(verifyResponse.data);

      case "overview":
        const overviewResponse = await service.getDataOverview();
        if (!overviewResponse.success) {
          return NextResponse.json(
            { error: overviewResponse.error },
            { status: 500 }
          );
        }
        return NextResponse.json(overviewResponse.data);

      default:
        return NextResponse.json(
          { error: "Invalid action. Use 'info', 'verify', or 'overview'" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in sheets API:", error);

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
      { error: "Failed to process sheets request" },
      { status: 500 }
    );
  }
}

// Initialize or reinitialize the Google Sheets integration
export async function POST(request: NextRequest) {
  try {
    const service = await createDataService();

    // Re-initialize to ensure everything is set up correctly
    await service.initialize();

    // Verify integrity after initialization
    const verifyResponse = await service.verifyIntegrity();

    if (!verifyResponse.success) {
      return NextResponse.json(
        { error: verifyResponse.error },
        { status: 500 }
      );
    }

    // Get updated spreadsheet info
    const infoResponse = await service.getSpreadsheetInfo();

    return NextResponse.json({
      success: true,
      message: "Google Sheets integration initialized successfully",
      integrity: verifyResponse.data,
      spreadsheet: infoResponse.success ? infoResponse.data : null,
    });
  } catch (error) {
    console.error("Error initializing sheets:", error);
    return NextResponse.json(
      { error: "Failed to initialize Google Sheets integration" },
      { status: 500 }
    );
  }
}
