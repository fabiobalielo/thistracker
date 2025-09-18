import { NextRequest, NextResponse } from "next/server";
import { createDataService } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const service = await createDataService();
    const response = await service.getSettings();

    if (!response.success) {
      return NextResponse.json({ error: response.error }, { status: 500 });
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error fetching settings:", error);

    // Check if it's an authentication error
    if (error instanceof Error && error.message.includes("access token")) {
      return NextResponse.json(
        {
          error: "Authentication required. Please sign in to access your data.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const service = await createDataService();
    const response = await service.updateSettings(data);

    if (!response.success) {
      return NextResponse.json({ error: response.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
