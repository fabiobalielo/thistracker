import { NextRequest, NextResponse } from "next/server";
import { createDataService } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const projectId = searchParams.get("projectId");
    const taskId = searchParams.get("taskId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const service = await createDataService();
    const response = await service.getTimeEntries({
      clientId: clientId || undefined,
      projectId: projectId || undefined,
      taskId: taskId || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    if (!response.success) {
      return NextResponse.json({ error: response.error }, { status: 500 });
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error fetching time entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch time entries" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const service = await createDataService();
    const response = await service.createTimeEntry(data);

    if (!response.success) {
      return NextResponse.json({ error: response.error }, { status: 400 });
    }

    return NextResponse.json(response.data, { status: 201 });
  } catch (error) {
    console.error("Error creating time entry:", error);
    return NextResponse.json(
      { error: "Failed to create time entry" },
      { status: 500 }
    );
  }
}
