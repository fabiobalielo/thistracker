import { NextRequest, NextResponse } from "next/server";
import { createGoogleAPIs } from "@/lib/google-apis";
import { DataService } from "@/lib/data-service";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Debug: Starting Google Sheets connection test...");

    // Test 1: Check authentication
    console.log("🔍 Debug: Testing authentication...");
    const apis = await createGoogleAPIs();
    console.log("✅ Debug: Authentication successful");

    // Test 2: Initialize data service
    console.log("🔍 Debug: Initializing DataService...");
    const dataService = new DataService(apis.sheets, apis.drive);
    await dataService.initialize();
    console.log("✅ Debug: DataService initialized");

    // Test 3: Get spreadsheet info
    console.log("🔍 Debug: Getting spreadsheet info...");
    const spreadsheetInfo = await dataService.getSpreadsheetInfo();
    console.log("📊 Debug: Spreadsheet info:", spreadsheetInfo);

    // Test 4: Verify integrity
    console.log("🔍 Debug: Verifying spreadsheet integrity...");
    const integrityCheck = await dataService.verifyIntegrity();
    console.log("🔧 Debug: Integrity check:", integrityCheck);

    // Test 5: Try to get data from each sheet
    console.log("🔍 Debug: Testing data retrieval from each sheet...");

    const [
      clientsResponse,
      projectsResponse,
      tasksResponse,
      timeEntriesResponse,
    ] = await Promise.all([
      dataService.getClients(),
      dataService.getProjects(),
      dataService.getTasks(),
      dataService.getTimeEntries({ limit: 10 }),
    ]);

    const debugResults = {
      authentication: "✅ Success",
      dataServiceInitialization: "✅ Success",
      spreadsheetInfo: spreadsheetInfo.success
        ? spreadsheetInfo.data
        : spreadsheetInfo.error,
      integrityCheck: integrityCheck.success
        ? integrityCheck.data
        : integrityCheck.error,
      dataRetrieval: {
        clients: {
          success: clientsResponse.success,
          count: clientsResponse.success ? clientsResponse.data?.length : 0,
          error: clientsResponse.error,
        },
        projects: {
          success: projectsResponse.success,
          count: projectsResponse.success ? projectsResponse.data?.length : 0,
          error: projectsResponse.error,
        },
        tasks: {
          success: tasksResponse.success,
          count: tasksResponse.success ? tasksResponse.data?.length : 0,
          error: tasksResponse.error,
        },
        timeEntries: {
          success: timeEntriesResponse.success,
          count: timeEntriesResponse.success
            ? timeEntriesResponse.data?.length
            : 0,
          error: timeEntriesResponse.error,
        },
      },
    };

    console.log("📋 Debug: Complete test results:", debugResults);

    return NextResponse.json({
      success: true,
      message: "Google Sheets connection debug completed",
      results: debugResults,
    });
  } catch (error) {
    console.error(
      "❌ Debug: Error during Google Sheets connection test:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Google Sheets connection test failed",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

