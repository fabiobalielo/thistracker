import { NextRequest, NextResponse } from "next/server";
import { createGoogleAPIs } from "@/lib/google-apis";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "name contains 'TimeTracker'";

    const apis = await createGoogleAPIs();
    const files = await apis.drive.getFiles(query);

    return NextResponse.json(files);
  } catch (error) {
    console.error("Error fetching drive files:", error);
    return NextResponse.json(
      { error: "Failed to fetch drive files" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, mimeType, content } = await request.json();

    if (!name || !mimeType) {
      return NextResponse.json(
        { error: "Name and MIME type are required" },
        { status: 400 }
      );
    }

    const apis = await createGoogleAPIs();
    const file = await apis.drive.createFile(name, mimeType, content);

    return NextResponse.json(file);
  } catch (error) {
    console.error("Error creating drive file:", error);
    return NextResponse.json(
      { error: "Failed to create drive file" },
      { status: 500 }
    );
  }
}
