import { NextRequest, NextResponse } from "next/server";
import { createGoogleAPIs } from "@/lib/google-apis";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const spreadsheetId = searchParams.get("spreadsheetId");
    const range = searchParams.get("range") || "A1:Z1000";

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "Spreadsheet ID is required" },
        { status: 400 }
      );
    }

    const apis = await createGoogleAPIs();
    const values = await apis.sheets.getSheetValues(spreadsheetId, range);

    return NextResponse.json(values);
  } catch (error) {
    console.error("Error fetching sheet values:", error);
    return NextResponse.json(
      { error: "Failed to fetch sheet values" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, data } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const apis = await createGoogleAPIs();

    // Create new spreadsheet
    const spreadsheet = await apis.sheets.createSpreadsheet(title);

    // If data is provided, populate the first sheet
    if (data && Array.isArray(data)) {
      const range = "A1:Z1000";
      await apis.sheets.updateSheet(
        spreadsheet.data.spreadsheetId,
        range,
        data
      );
    }

    return NextResponse.json(spreadsheet);
  } catch (error) {
    console.error("Error creating spreadsheet:", error);
    return NextResponse.json(
      { error: "Failed to create spreadsheet" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { spreadsheetId, range, values } = await request.json();

    if (!spreadsheetId || !range || !values) {
      return NextResponse.json(
        { error: "Spreadsheet ID, range, and values are required" },
        { status: 400 }
      );
    }

    const apis = await createGoogleAPIs();
    const result = await apis.sheets.updateSheet(spreadsheetId, range, values);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating sheet:", error);
    return NextResponse.json(
      { error: "Failed to update sheet" },
      { status: 500 }
    );
  }
}
