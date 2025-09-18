import { NextRequest, NextResponse } from "next/server";
import { createDataService } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    const service = await createDataService();
    const response = await service.getProjects(clientId || undefined);

    if (!response.success) {
      return NextResponse.json({ error: response.error }, { status: 500 });
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("API: Received project creation request");
    const data = await request.json();
    console.log("API: Parsed request data:", data);

    const service = await createDataService();
    console.log("API: DataService initialized");

    const response = await service.createProject(data);
    console.log("API: DataService response:", response);

    if (!response.success) {
      console.error("API: Project creation failed:", response.error);
      return NextResponse.json({ error: response.error }, { status: 400 });
    }

    console.log("API: Project created successfully");
    return NextResponse.json(response.data, { status: 201 });
  } catch (error) {
    console.error("API: Error creating project:", error);
    console.error(
      "API: Error stack:",
      error instanceof Error ? error.stack : "No stack"
    );
    return NextResponse.json(
      {
        error: "Failed to create project",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
