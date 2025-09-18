import { NextResponse } from "next/server";
import { createGoogleAPIs } from "@/lib/google-apis";
import { DataService } from "@/lib/data-service";

let dataService: DataService | null = null;

async function getDataService() {
  if (!dataService) {
    const apis = await createGoogleAPIs();
    dataService = new DataService(apis.sheets, apis.drive);
    await dataService.initialize();
  }
  return dataService;
}

export async function GET() {
  try {
    console.log("API: Starting data fetch...");
    console.log("API: Environment check:", {
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    });
    
    const service = await getDataService();
    console.log("API: DataService initialized successfully");

    // Fetch all data in a single operation
    console.log("API: Fetching data from Google Sheets...");
    const [
      clientsResponse,
      projectsResponse,
      tasksResponse,
      timeEntriesResponse,
    ] = await Promise.all([
      service.getClients(),
      service.getProjects(),
      service.getTasks(),
      service.getTimeEntries({ limit: 1000 }),
    ]);

    console.log("API: Data fetch completed:", {
      clients: clientsResponse.success ? clientsResponse.data?.length : 0,
      projects: projectsResponse.success ? projectsResponse.data?.length : 0,
      tasks: tasksResponse.success ? tasksResponse.data?.length : 0,
      timeEntries: timeEntriesResponse.success
        ? timeEntriesResponse.data?.length
        : 0,
    });

    // Check for any errors
    if (!clientsResponse.success) {
      console.error("API: Failed to fetch clients:", clientsResponse.error);
      return NextResponse.json(
        { error: `Failed to fetch clients: ${clientsResponse.error}` },
        { status: 500 }
      );
    }
    if (!projectsResponse.success) {
      console.error("API: Failed to fetch projects:", projectsResponse.error);
      return NextResponse.json(
        { error: `Failed to fetch projects: ${projectsResponse.error}` },
        { status: 500 }
      );
    }
    if (!tasksResponse.success) {
      console.error("API: Failed to fetch tasks:", tasksResponse.error);
      return NextResponse.json(
        { error: `Failed to fetch tasks: ${tasksResponse.error}` },
        { status: 500 }
      );
    }
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
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
