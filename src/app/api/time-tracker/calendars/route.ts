import { NextRequest, NextResponse } from "next/server";
import { createGoogleAPIs } from "@/lib/google-apis";

export async function GET(request: NextRequest) {
  try {
    const apis = await createGoogleAPIs();
    const calendars = await apis.calendar.getCalendars();

    return NextResponse.json(calendars);
  } catch (error) {
    console.error("Error fetching calendars:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendars" },
      { status: 500 }
    );
  }
}
