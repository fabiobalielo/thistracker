import { NextRequest, NextResponse } from "next/server";
import { createDataService } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const service = await createDataService();
    const response = await service.getTasks(projectId || undefined);

    if (!response.success) {
      return NextResponse.json({ error: response.error }, { status: 500 });
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log("Task creation request data:", data);

    const service = await createDataService();
    console.log("DataService initialized, creating task...");

    const response = await service.createTask(data);
    console.log("Task creation response:", response);

    if (!response.success) {
      console.error("Task creation failed:", response.error);
      return NextResponse.json({ error: response.error }, { status: 400 });
    }

    console.log("Task created successfully:", response.data);
    return NextResponse.json(response.data, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
