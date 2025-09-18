import { NextRequest, NextResponse } from "next/server";
import { createGoogleAPIs } from "@/lib/google-apis";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get("calendarId") || "primary";
    const timeMin = searchParams.get("timeMin");
    const timeMax = searchParams.get("timeMax");

    const apis = await createGoogleAPIs();
    const events = await apis.calendar.getEvents(
      calendarId,
      timeMin || undefined,
      timeMax || undefined
    );

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { calendarId, event } = await request.json();

    if (!calendarId || !event) {
      return NextResponse.json(
        { error: "Calendar ID and event data are required" },
        { status: 400 }
      );
    }

    const apis = await createGoogleAPIs();
    const createdEvent = await apis.calendar.createEvent(calendarId, event);

    return NextResponse.json(createdEvent);
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
