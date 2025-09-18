import { NextRequest, NextResponse } from "next/server";
import { createDataService } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const service = await createDataService();

    // Get comprehensive debug information
    const debugInfo = {
      timestamp: new Date().toISOString(),
      spreadsheetInfo: null as unknown,
      sheetsStatus: null as unknown,
      tasksData: null as unknown,
      error: null as unknown,
    };

    try {
      // Get spreadsheet info
      const spreadsheetResponse = await service.getSpreadsheetInfo();
      debugInfo.spreadsheetInfo = spreadsheetResponse.success
        ? spreadsheetResponse.data
        : spreadsheetResponse.error;

      // Check integrity
      const integrityResponse = await service.verifyIntegrity();
      debugInfo.sheetsStatus = integrityResponse.success
        ? integrityResponse.data
        : integrityResponse.error;

      // Try to get tasks
      const tasksResponse = await service.getTasks();
      debugInfo.tasksData = {
        success: tasksResponse.success,
        count: tasksResponse.success ? tasksResponse.data?.length : 0,
        data: tasksResponse.success ? tasksResponse.data : tasksResponse.error,
      };
    } catch (error) {
      debugInfo.error = {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      };
    }

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json(
      {
        error: "Failed to get debug info",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
