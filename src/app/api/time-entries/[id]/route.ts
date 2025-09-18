import { NextRequest, NextResponse } from "next/server";
import { createDataService } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = await createDataService();
    const timeEntriesResponse = await service.getTimeEntries();

    if (!timeEntriesResponse.success) {
      return NextResponse.json(
        { error: timeEntriesResponse.error },
        { status: 500 }
      );
    }

    const timeEntry = timeEntriesResponse.data!.find((e) => e.id === id);
    if (!timeEntry) {
      return NextResponse.json(
        { error: "Time entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(timeEntry);
  } catch (error) {
    console.error("Error fetching time entry:", error);
    return NextResponse.json(
      { error: "Failed to fetch time entry" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const service = await createDataService();
    const response = await service.updateTimeEntry(id, data);

    if (!response.success) {
      return NextResponse.json({ error: response.error }, { status: 400 });
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error updating time entry:", error);
    return NextResponse.json(
      { error: "Failed to update time entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = await createDataService();
    const response = await service.deleteTimeEntry(id);

    if (!response.success) {
      return NextResponse.json({ error: response.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting time entry:", error);
    return NextResponse.json(
      { error: "Failed to delete time entry" },
      { status: 500 }
    );
  }
}
