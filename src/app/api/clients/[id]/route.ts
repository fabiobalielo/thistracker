import { NextRequest, NextResponse } from "next/server";
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = await getDataService();
    const clientsResponse = await service.getClients();

    if (!clientsResponse.success) {
      return NextResponse.json(
        { error: clientsResponse.error },
        { status: 500 }
      );
    }

    const client = clientsResponse.data!.find((c) => c.id === id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json(
      { error: "Failed to fetch client" },
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
    const service = await getDataService();
    const response = await service.updateClient(id, data);

    if (!response.success) {
      return NextResponse.json({ error: response.error }, { status: 400 });
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
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
    const service = await getDataService();
    const response = await service.deleteClient(id);

    if (!response.success) {
      return NextResponse.json({ error: response.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}
