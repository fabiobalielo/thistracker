import { createGoogleAPIs } from "@/lib/google-apis";
import { DataService } from "@/lib/data-service";

/**
 * Creates a fresh DataService instance for each request.
 * This ensures proper user isolation - each user gets their own service instance
 * with their own Google Sheets access token and spreadsheet.
 */
export async function createDataService() {
  const apis = await createGoogleAPIs();
  const dataService = new DataService(apis.sheets, apis.drive);
  await dataService.initialize();
  return dataService;
}
