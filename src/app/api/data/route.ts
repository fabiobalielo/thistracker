import { NextResponse } from "next/server";
import { createDataService } from "@/lib/api-utils";

export async function GET() {
  try {
    console.log("API: Starting user-scoped data fetch...");

    const service = await createDataService();
    console.log(
      "API: DataService initialized successfully for authenticated user"
    );

    // Fetch all data sequentially to avoid rate limiting
    // This reduces the number of concurrent API calls to Google Sheets
    console.log(
      "API: Fetching data from Google Sheets (sequential to avoid rate limits)..."
    );

    const clientsResponse = await service.getClients();
    if (!clientsResponse.success) {
      console.error("API: Failed to fetch clients:", clientsResponse.error);
      return NextResponse.json(
        { error: `Failed to fetch clients: ${clientsResponse.error}` },
        { status: 500 }
      );
    }

    const projectsResponse = await service.getProjects();
    if (!projectsResponse.success) {
      console.error("API: Failed to fetch projects:", projectsResponse.error);
      return NextResponse.json(
        { error: `Failed to fetch projects: ${projectsResponse.error}` },
        { status: 500 }
      );
    }

    const tasksResponse = await service.getTasks();
    if (!tasksResponse.success) {
      console.error("API: Failed to fetch tasks:", tasksResponse.error);
      return NextResponse.json(
        { error: `Failed to fetch tasks: ${tasksResponse.error}` },
        { status: 500 }
      );
    }

    const timeEntriesResponse = await service.getTimeEntries({ limit: 1000 });
    if (!timeEntriesResponse.success) {
      console.error(
        "API: Failed to fetch time entries:",
        timeEntriesResponse.error
      );
      return NextResponse.json(
        { error: `Failed to fetch time entries: ${timeEntriesResponse.error}` },
        { status: 500 }
      );
    }

    console.log("API: Data fetch completed:", {
      clients: clientsResponse.data?.length || 0,
      projects: projectsResponse.data?.length || 0,
      tasks: tasksResponse.data?.length || 0,
      timeEntries: timeEntriesResponse.data?.length || 0,
    });

    // Return all data in a single response
    const responseData = {
      clients: clientsResponse.data || [],
      projects: projectsResponse.data || [],
      tasks: tasksResponse.data || [],
      timeEntries: timeEntriesResponse.data || [],
    };

    console.log("API: Returning data successfully");
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("API: Error fetching all data:", error);
    console.error("API: Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Check if it's a rate limiting error
    if (error instanceof Error && error.message.includes("429")) {
      console.error("API: Rate limiting error detected");
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait a moment and try again.",
          code: "RATE_LIMIT_EXCEEDED",
        },
        { status: 429 }
      );
    }

    // Check if it's an authentication error
    if (error instanceof Error && error.message.includes("access token")) {
      console.error("API: Authentication error detected");
      return NextResponse.json(
        {
          error: "Authentication required. Please sign in to access your data.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    // Check if it's a session error
    if (error instanceof Error && error.message.includes("session")) {
      console.error("API: Session error detected");
      return NextResponse.json(
        {
          error: "No active session found. Please sign in.",
          code: "NO_SESSION",
        },
        { status: 401 }
      );
    }

    console.error("API: Returning generic error response");
    return NextResponse.json(
      {
        error: "Failed to fetch data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
