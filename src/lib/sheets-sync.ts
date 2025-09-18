import { GoogleSheetsAPI, GoogleDriveAPI } from "./google-apis";
import { Client, Project, Task, TimeEntry, SheetsConfig } from "./types";
import { SheetsPartitioningService } from "./sheets-partitioning";

export class SheetsSyncService {
  private sheetsAPI: GoogleSheetsAPI;
  private driveAPI: GoogleDriveAPI;
  private config: SheetsConfig;

  constructor(
    sheetsAPI: GoogleSheetsAPI,
    driveAPI: GoogleDriveAPI,
    config: SheetsConfig
  ) {
    this.sheetsAPI = sheetsAPI;
    this.driveAPI = driveAPI;
    this.config = config;
  }

  // Initialize or get existing spreadsheet
  async initializeSpreadsheet(): Promise<SheetsConfig> {
    try {
      // Try to find existing spreadsheet
      const existingSpreadsheet = await this.findExistingSpreadsheet();
      console.log("Existing spreadsheet result:", existingSpreadsheet);

      if (existingSpreadsheet) {
        this.config.spreadsheetId = existingSpreadsheet.spreadsheetId;
        console.log(
          "Found existing ThisTracker spreadsheet:",
          this.config.spreadsheetId
        );

        if (!this.config.spreadsheetId) {
          console.error("Existing spreadsheet found but no ID extracted");
          throw new Error(
            "Failed to get spreadsheet ID from existing spreadsheet"
          );
        }

        // Ensure all required sheets exist
        await this.ensureRequiredSheetsExist();

        return this.config;
      }

      // Create new spreadsheet with unique name
      const uniqueName = await this.generateUniqueSpreadsheetName();
      const spreadsheet = await this.sheetsAPI.createSpreadsheet(uniqueName);

      console.log("Spreadsheet creation response:", spreadsheet);
      console.log("Spreadsheet response keys:", Object.keys(spreadsheet));

      // Try different possible properties for the spreadsheet ID
      this.config.spreadsheetId =
        spreadsheet.spreadsheetId ||
        spreadsheet.data?.spreadsheetId ||
        spreadsheet.id;

      console.log("Extracted spreadsheet ID:", this.config.spreadsheetId);

      if (!this.config.spreadsheetId) {
        console.error(
          "Available properties in response:",
          Object.keys(spreadsheet)
        );
        throw new Error("Failed to get spreadsheet ID from Google Sheets API");
      }

      console.log(
        "Created new ThisTracker spreadsheet:",
        this.config.spreadsheetId
      );

      // Create sheets for each collection (tabs)
      await this.createSheets();

      // Set up basic configuration data
      await this.initializeConfigurationData();

      return this.config;
    } catch (error) {
      console.error("Error initializing spreadsheet:", error);
      throw error;
    }
  }

  private async findExistingSpreadsheet(): Promise<{
    spreadsheetId: string;
  } | null> {
    try {
      // Search for existing unique ThisTracker spreadsheet with exact name match
      // IMPORTANT: Only search for spreadsheets owned by the current user to prevent cross-account data leakage
      // The 'me' in owners filter ensures each user only sees their own spreadsheets
      const exactQuery =
        "name='ThisTracker-Main' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and 'me' in owners";
      console.log(
        "Searching for exact ThisTracker spreadsheet (user-specific):",
        exactQuery
      );
      const exactResponse = await this.driveAPI.searchFiles(exactQuery);

      if (exactResponse.files && exactResponse.files.length > 0) {
        console.log(
          "Found exact ThisTracker-Main spreadsheet owned by current user:",
          exactResponse.files[0].id
        );
        return { spreadsheetId: exactResponse.files[0].id };
      }

      // Fallback: Search for any ThisTracker spreadsheets owned by the current user
      const query =
        "name contains 'ThisTracker' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and 'me' in owners";
      console.log(
        "Searching for existing spreadsheets with query (user-specific):",
        query
      );
      const response = await this.driveAPI.searchFiles(query);
      console.log("Drive API search response:", response);

      if (response.files && response.files.length > 0) {
        console.log(
          "Found files owned by current user:",
          response.files.length
        );
        // Find the most recent ThisTracker spreadsheet
        const spreadsheets = response.files
          .filter((file: { name: string; createdTime: string }) =>
            file.name.startsWith("ThisTracker")
          )
          .sort(
            (a: { createdTime: string }, b: { createdTime: string }) =>
              new Date(b.createdTime).getTime() -
              new Date(a.createdTime).getTime()
          );

        console.log(
          "Filtered spreadsheets owned by current user:",
          spreadsheets.length
        );

        if (spreadsheets.length > 0) {
          console.log(
            "Found existing ThisTracker spreadsheet owned by current user:",
            spreadsheets[0].name,
            "ID:",
            spreadsheets[0].id
          );
          return { spreadsheetId: spreadsheets[0].id };
        }
      }

      console.log("No existing spreadsheets found for current user");
      return null;
    } catch (error) {
      console.error("Error searching for existing spreadsheet:", error);
      return null;
    }
  }

  private async generateUniqueSpreadsheetName(): Promise<string> {
    // First, try to create the main spreadsheet with a consistent name
    // Note: Each user will get their own "ThisTracker-Main" spreadsheet
    const mainName = "ThisTracker-Main";

    try {
      // Only check if the current user has a spreadsheet with this name
      const query = `name='${mainName}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and 'me' in owners`;
      const response = await this.driveAPI.searchFiles(query);

      if (!response.files || response.files.length === 0) {
        // Main name is available for current user
        console.log("Using main ThisTracker spreadsheet name:", mainName);
        return mainName;
      }
    } catch (error) {
      console.warn("Error checking main name availability:", error);
    }

    // Fallback: create with timestamp if main name is taken by current user
    const baseName = "ThisTracker";
    const timestamp = new Date().toISOString().split("T")[0];
    const randomSuffix = Math.random().toString(36).substring(2, 8);

    // Try to find a unique name by checking existing files owned by current user
    let attempt = 0;
    let name = `${baseName}-${timestamp}-${randomSuffix}`;

    while (attempt < 10) {
      try {
        const query = `name='${name}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and 'me' in owners`;
        const response = await this.driveAPI.searchFiles(query);

        if (!response.files || response.files.length === 0) {
          // Name is unique for current user
          console.log("Generated unique spreadsheet name:", name);
          return name;
        }

        // Name exists for current user, try again with different suffix
        attempt++;
        const newSuffix = Math.random().toString(36).substring(2, 8);
        name = `${baseName}-${timestamp}-${newSuffix}`;
      } catch (error) {
        console.warn(`Error checking name uniqueness for ${name}:`, error);
        // If we can't check, just use the current name
        return name;
      }
    }

    // Fallback: add timestamp with milliseconds
    const msTimestamp = Date.now();
    const fallbackName = `${baseName}-${timestamp}-${msTimestamp}`;
    console.log("Using fallback spreadsheet name:", fallbackName);
    return fallbackName;
  }

  private async ensureRequiredSheetsExist(): Promise<void> {
    try {
      const requiredSheets = [
        {
          name: this.config.clientsSheetName,
          headers: this.getClientHeaders(),
        },
        {
          name: this.config.projectsSheetName,
          headers: this.getProjectHeaders(),
        },
        {
          name: this.config.tasksSheetName,
          headers: this.getTaskHeaders(),
        },
        {
          name: "Settings",
          headers: this.getSettingsHeaders(),
        },
      ];

      console.log(
        "Ensuring required sheets exist:",
        requiredSheets.map((s) => s.name)
      );

      for (const sheet of requiredSheets) {
        console.log(`Checking/creating sheet: ${sheet.name}`);
        await this.ensureSheetExists(sheet.name, sheet.headers);
        console.log(`Sheet ${sheet.name} is ready`);
      }

      console.log("Ensured all required sheets exist");

      // Verify the sheets actually exist by trying to read from them
      try {
        const spreadsheet = await this.sheetsAPI.getSpreadsheet(
          this.config.spreadsheetId
        );
        const existingSheets =
          spreadsheet.sheets?.map(
            (sheet: { properties?: { title?: string } }) =>
              sheet.properties?.title
          ) || [];
        console.log("Current sheets in spreadsheet:", existingSheets);

        const missingSheets = requiredSheets.filter(
          (sheet) => !existingSheets.includes(sheet.name)
        );
        if (missingSheets.length > 0) {
          console.warn(
            "Some required sheets are missing:",
            missingSheets.map((s) => s.name)
          );
        } else {
          console.log("All required sheets are present and accessible");
        }
      } catch (error) {
        console.warn("Could not verify sheet existence:", error);
      }
    } catch (error) {
      console.error("Error ensuring required sheets exist:", error);
      throw error;
    }
  }

  private async ensureSheetExists(
    sheetName: string,
    headers: string[]
  ): Promise<void> {
    try {
      // Try to get the sheet to see if it exists
      const response = await this.sheetsAPI.getSheetValues(
        this.config.spreadsheetId,
        this.createSheetRange(sheetName, "A1:A1")
      );
      console.log(`Sheet ${sheetName} already exists with response:`, response);
    } catch (error) {
      // Sheet doesn't exist, create it
      console.log(`Creating missing sheet: ${sheetName}`, error);
      await this.createSheetWithHeaders(sheetName, headers);
      console.log(`Successfully created sheet: ${sheetName}`);
    }
  }

  private async createSheets(): Promise<void> {
    try {
      // Create separate sheets for each collection
      const sheets = [
        {
          name: this.config.clientsSheetName,
          headers: this.getClientHeaders(),
        },
        {
          name: this.config.projectsSheetName,
          headers: this.getProjectHeaders(),
        },
        {
          name: this.config.tasksSheetName,
          headers: this.getTaskHeaders(),
        },
        {
          name: this.config.timeEntriesSheetName,
          headers: this.getTimeEntryHeaders(),
        },
        {
          name: "Settings",
          headers: this.getSettingsHeaders(),
        },
      ];

      for (const sheet of sheets) {
        await this.createSheetWithHeaders(sheet.name, sheet.headers);
      }

      console.log(
        "Created base sheets (tabs): Clients, Projects, Tasks, Time Entries, Settings"
      );

      // Delete the default "Sheet1" if it exists
      await this.deleteDefaultSheet();
    } catch (error) {
      console.error("Error creating sheets:", error);
      throw error;
    }
  }

  private async createSheetWithHeaders(
    sheetName: string,
    headers: string[]
  ): Promise<void> {
    try {
      console.log(`Creating sheet: ${sheetName} with headers:`, headers);

      // First, create the sheet using batchUpdate
      const createSheetRequest = {
        addSheet: {
          properties: {
            title: sheetName,
          },
        },
      };

      console.log(`Calling batchUpdate to create sheet: ${sheetName}`);
      // Use the batchUpdate method to create the sheet
      const batchResult = await this.sheetsAPI.batchUpdate(
        this.config.spreadsheetId,
        [createSheetRequest]
      );
      console.log(`Batch update result for ${sheetName}:`, batchResult);

      // Then add headers to the new sheet
      console.log(`Adding headers to sheet: ${sheetName}`);
      await this.sheetsAPI.updateSheet(
        this.config.spreadsheetId,
        this.createSheetRange(sheetName, "A1:Z1"),
        [headers]
      );

      console.log(`Successfully created sheet: ${sheetName}`);
    } catch (error) {
      console.error(`Error creating sheet ${sheetName}:`, error);
      // If sheet already exists, just add headers
      try {
        console.log(`Trying to add headers to existing sheet: ${sheetName}`);
        await this.sheetsAPI.updateSheet(
          this.config.spreadsheetId,
          this.createSheetRange(sheetName, "A1:Z1"),
          [headers]
        );
        console.log(`Added headers to existing sheet: ${sheetName}`);
      } catch (headerError) {
        console.error(
          `Error adding headers to sheet ${sheetName}:`,
          headerError
        );
        throw headerError;
      }
    }
  }

  // Client operations
  async syncClients(clients: Client[]): Promise<void> {
    console.log("Syncing clients to Google Sheets:", clients);

    const data = [
      this.getClientHeaders(),
      ...clients.map((client) => this.clientToRow(client)),
    ];

    console.log("Data to sync:", data);
    console.log("Spreadsheet ID:", this.config.spreadsheetId);

    // First, clear the entire sheet to prevent duplication
    await this.clearSheet(this.config.clientsSheetName);

    // Then update with new data
    await this.sheetsAPI.updateSheet(
      this.config.spreadsheetId,
      this.createSheetRange(this.config.clientsSheetName, "A1:Z1000"),
      data
    );

    console.log("Clients synced successfully");
  }

  async getClients(): Promise<Client[]> {
    const response = await this.sheetsAPI.getSheetValues(
      this.config.spreadsheetId,
      this.createSheetRange(this.config.clientsSheetName, "A2:Z1000")
    );

    if (!response.values) return [];

    // Convert rows to clients (skip header row)
    return response.values.map((row: string[]) => this.rowToClient(row));
  }

  // Project operations
  async syncProjects(projects: Project[]): Promise<void> {
    console.log("Syncing projects to Google Sheets:", projects);

    const data = [
      this.getProjectHeaders(),
      ...projects.map((project) => this.projectToRow(project)),
    ];

    console.log("Data to sync:", data);

    // First, clear the entire sheet to prevent duplication
    await this.clearSheet(this.config.projectsSheetName);

    // Then update with new data
    await this.sheetsAPI.updateSheet(
      this.config.spreadsheetId,
      this.createSheetRange(this.config.projectsSheetName, "A1:Z1000"),
      data
    );

    console.log("Projects synced successfully");
  }

  async getProjects(): Promise<Project[]> {
    const response = await this.sheetsAPI.getSheetValues(
      this.config.spreadsheetId,
      this.createSheetRange(this.config.projectsSheetName, "A2:Z1000")
    );

    if (!response.values) return [];

    // Convert rows to projects (skip header row)
    return response.values.map((row: string[]) => this.rowToProject(row));
  }

  // Task operations - simple approach like clients and projects
  async syncTasks(tasks: Task[]): Promise<void> {
    console.log(`Syncing ${tasks.length} tasks to Google Sheets`);

    // Ensure the Tasks sheet exists before trying to sync
    await this.ensureSheetExists(
      this.config.tasksSheetName,
      this.getTaskHeaders()
    );

    const data = [
      this.getTaskHeaders(),
      ...tasks.map((task) => this.taskToRow(task)),
    ];

    console.log("Data to sync:", data);
    console.log("Spreadsheet ID:", this.config.spreadsheetId);

    // Debug: Check the isActive values being synced
    console.log(
      "Tasks being synced with isActive values:",
      tasks.map((task) => ({
        id: task.id,
        name: task.name,
        isActive: task.isActive,
      }))
    );
    console.log(
      "Row data for isActive column:",
      data.slice(1).map((row) => ({
        taskId: row[0],
        taskName: row[2],
        isActiveValue: row[9],
      }))
    );

    // First, clear the entire sheet to prevent duplication
    await this.clearSheet(this.config.tasksSheetName);

    // Then update with new data
    await this.sheetsAPI.updateSheet(
      this.config.spreadsheetId,
      this.createSheetRange(this.config.tasksSheetName, "A1:Z1000"),
      data
    );

    console.log("Tasks synced successfully");
  }

  async getTasks(options?: { projectId?: string }): Promise<Task[]> {
    const { projectId } = options || {};

    console.log(`Getting tasks from sheet: ${this.config.tasksSheetName}`);
    console.log(`Using spreadsheet ID: ${this.config.spreadsheetId}`);

    try {
      const response = await this.sheetsAPI.getSheetValues(
        this.config.spreadsheetId,
        this.createSheetRange(this.config.tasksSheetName, "A2:Z1000")
      );

      console.log("Raw response from Google Sheets for tasks:", {
        hasValues: !!response.values,
        rowCount: response.values ? response.values.length : 0,
        firstFewRows: response.values ? response.values.slice(0, 3) : [],
        responseKeys: Object.keys(response),
      });

      // Debug: Check the isActive column specifically
      if (response.values && response.values.length > 0) {
        console.log("First row isActive value:", response.values[0][9]);
        console.log(
          "All isActive values:",
          response.values.map((row: string[]) => ({
            id: row[0],
            isActive: row[9],
          }))
        );
      }

      if (!response.values) {
        console.log(
          "No values found in Tasks sheet - this might be normal if no tasks exist yet"
        );
        return [];
      }

      // Convert rows to tasks (skip header row)
      let tasks: Task[] = [];
      try {
        tasks = response.values.map((row: string[], index: number) => {
          console.log(`Processing task row ${index}:`, row);
          const task = this.rowToTask(row);
          console.log(`Converted to task:`, task);
          return task;
        });
        console.log(`Successfully converted ${tasks.length} rows to tasks`);
      } catch (error) {
        console.error("Error converting rows to tasks:", error);
        console.error("Problematic rows:", response.values);
        return [];
      }

      // Filter by projectId if specified
      if (projectId) {
        const filteredTasks = tasks.filter(
          (task: Task) => task.projectId === projectId
        );
        console.log(
          `Filtered tasks for project ${projectId}: ${filteredTasks.length} out of ${tasks.length}`
        );
        tasks = filteredTasks;
      }

      // Sort by creation date (newest first)
      tasks.sort(
        (a: Task, b: Task) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      console.log(`Returning ${tasks.length} tasks`);
      return tasks;
    } catch (error) {
      console.error("Error in getTasks:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        spreadsheetId: this.config.spreadsheetId,
        tasksSheetName: this.config.tasksSheetName,
      });
      return [];
    }
  }

  // Time Entry operations
  async syncTimeEntries(timeEntries: TimeEntry[]): Promise<void> {
    console.log("Syncing time entries to Google Sheets:", timeEntries);

    const data = [
      this.getTimeEntryHeaders(),
      ...timeEntries.map((entry) => this.timeEntryToRow(entry)),
    ];

    console.log("Data to sync:", data);
    console.log("Spreadsheet ID:", this.config.spreadsheetId);

    // First, clear the entire sheet to prevent duplication
    await this.clearSheet(this.config.timeEntriesSheetName);

    // Then update with new data
    await this.sheetsAPI.updateSheet(
      this.config.spreadsheetId,
      this.createSheetRange(this.config.timeEntriesSheetName, "A1:Z1000"),
      data
    );

    console.log("Time entries synced successfully");
  }

  private groupTimeEntriesByMonth(
    timeEntries: TimeEntry[]
  ): Map<string, TimeEntry[]> {
    const grouped = new Map<string, TimeEntry[]>();

    for (const entry of timeEntries) {
      const sheetName = SheetsPartitioningService.getTimeEntrySheetName(entry);

      if (!grouped.has(sheetName)) {
        grouped.set(sheetName, []);
      }

      grouped.get(sheetName)!.push(entry);
    }

    return grouped;
  }

  private async syncTimeEntriesToSheet(
    sheetName: string,
    entries: TimeEntry[]
  ): Promise<void> {
    try {
      const data = [
        this.getTimeEntryHeaders(),
        ...entries.map((entry) => this.timeEntryToRow(entry)),
      ];

      console.log(`Syncing ${entries.length} time entries to ${sheetName}`);
      console.log(`Data to sync:`, data);

      await this.sheetsAPI.updateSheet(
        this.config.spreadsheetId,
        this.createSheetRange(sheetName, "A1:Z1000"),
        data
      );

      console.log(`Synced ${entries.length} time entries to ${sheetName}`);
    } catch (error) {
      console.error(`Error syncing time entries to ${sheetName}:`, error);
      // If sheet doesn't exist, create it and try again
      if (
        error instanceof Error &&
        error.message.includes("Unable to parse range")
      ) {
        console.log(`Sheet ${sheetName} doesn't exist, creating it...`);
        try {
          await this.createSheetWithHeaders(
            sheetName,
            this.getTimeEntryHeaders()
          );
          console.log(`Created sheet ${sheetName}, retrying sync...`);

          // Retry the sync
          const retryData = [
            this.getTimeEntryHeaders(),
            ...entries.map((entry) => this.timeEntryToRow(entry)),
          ];
          await this.sheetsAPI.updateSheet(
            this.config.spreadsheetId,
            this.createSheetRange(sheetName, "A1:Z1000"),
            retryData
          );
          console.log(
            `Successfully synced ${entries.length} time entries to ${sheetName}`
          );
        } catch (retryError) {
          console.error(
            `Failed to create and sync to sheet ${sheetName}:`,
            retryError
          );
          throw retryError;
        }
      } else {
        throw error;
      }
    }
  }

  private async ensureTimeEntrySheetExists(sheetName: string): Promise<void> {
    try {
      // Try to get the sheet to see if it exists
      await this.sheetsAPI.getSheetValues(
        this.config.spreadsheetId,
        this.createSheetRange(sheetName, "A1:A1")
      );
      console.log(`Time entry sheet ${sheetName} already exists`);
    } catch (error) {
      // Sheet doesn't exist, create it
      console.log(`Creating new time entry sheet: ${sheetName}`);
      console.log(`Error checking sheet existence:`, error);

      try {
        await this.createSheetWithHeaders(
          sheetName,
          this.getTimeEntryHeaders()
        );
        console.log(`Successfully created time entry sheet: ${sheetName}`);

        // Verify the sheet was created by trying to access it
        try {
          await this.sheetsAPI.getSheetValues(
            this.config.spreadsheetId,
            this.createSheetRange(sheetName, "A1:A1")
          );
          console.log(`Verified time entry sheet ${sheetName} is accessible`);
        } catch (verifyError) {
          console.error(
            `Failed to verify time entry sheet ${sheetName}:`,
            verifyError
          );
          throw new Error(
            `Sheet ${sheetName} was created but is not accessible`
          );
        }
      } catch (createError) {
        console.error(
          `Failed to create time entry sheet ${sheetName}:`,
          createError
        );
        throw createError;
      }
    }
  }

  async getTimeEntries(options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    page?: number;
  }): Promise<TimeEntry[]> {
    const response = await this.sheetsAPI.getSheetValues(
      this.config.spreadsheetId,
      this.createSheetRange(this.config.timeEntriesSheetName, "A2:Z1000")
    );

    if (!response.values) return [];

    // Convert rows to time entries (skip header row)
    const allEntries = response.values.map((row: string[]) =>
      this.rowToTimeEntry(row)
    );

    // Sort by start time (newest first)
    allEntries.sort(
      (a: TimeEntry, b: TimeEntry) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    // Apply pagination if needed
    const { limit = 1000, page = 1 } = options || {};
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return allEntries.slice(startIndex, endIndex);
  }

  // Settings operations
  async syncSettings(settings: Record<string, unknown>): Promise<void> {
    const data = [
      this.getSettingsHeaders(),
      ...Object.entries(settings).map(([key, value]) => [
        key,
        typeof value === "object" ? JSON.stringify(value) : String(value),
        `Setting: ${key}`,
        typeof value,
        new Date().toISOString(),
      ]),
    ];

    await this.sheetsAPI.updateSheet(
      this.config.spreadsheetId,
      "Settings!A1:Z1000",
      data
    );
  }

  async getSettings(): Promise<Record<string, unknown>> {
    const response = await this.sheetsAPI.getSheetValues(
      this.config.spreadsheetId,
      "Settings!A2:Z1000"
    );

    if (!response.values) return {};

    const settings: Record<string, unknown> = {};
    for (const row of response.values) {
      const [key, value, , type] = row;
      if (key && value) {
        try {
          if (type === "object") {
            settings[key] = JSON.parse(value);
          } else if (type === "number") {
            settings[key] = parseFloat(value);
          } else if (type === "boolean") {
            settings[key] = value === "true";
          } else {
            settings[key] = value;
          }
        } catch {
          settings[key] = value;
        }
      }
    }

    return settings;
  }

  // Helper function to create properly escaped sheet ranges
  private createSheetRange(sheetName: string, range: string): string {
    // Escape sheet names that contain special characters
    // Note: Underscores don't need escaping, only hyphens and spaces do
    const escapedSheetName =
      sheetName.includes("-") || sheetName.includes(" ")
        ? `'${sheetName}'`
        : sheetName;
    const fullRange = `${escapedSheetName}!${range}`;
    console.log(
      `Creating sheet range: ${fullRange} (from sheetName: ${sheetName})`
    );
    return fullRange;
  }

  // Clear a sheet by setting all cells to empty values
  private async clearSheet(sheetName: string): Promise<void> {
    try {
      console.log(`Clearing sheet: ${sheetName}`);

      // Get the current sheet to determine its size
      const response = await this.sheetsAPI.getSheetValues(
        this.config.spreadsheetId,
        this.createSheetRange(sheetName, "A1:Z1000")
      );

      if (response.values && response.values.length > 0) {
        // Create an array of empty strings with the same dimensions
        const emptyData = Array(response.values.length).fill(
          Array(response.values[0].length).fill("")
        );

        // Update the sheet with empty data
        await this.sheetsAPI.updateSheet(
          this.config.spreadsheetId,
          this.createSheetRange(sheetName, "A1:Z1000"),
          emptyData
        );

        console.log(
          `Cleared ${response.values.length} rows from sheet: ${sheetName}`
        );
      } else {
        console.log(`Sheet ${sheetName} is already empty`);
      }
    } catch (error) {
      console.warn(`Could not clear sheet ${sheetName}:`, error);
      // Don't throw error as this is not critical
    }
  }

  // Header definitions
  private getClientHeaders(): string[] {
    return [
      "ID",
      "Name",
      "Email",
      "Phone",
      "Address",
      "Notes",
      "Created At",
      "Updated At",
      "Is Active",
    ];
  }

  private getProjectHeaders(): string[] {
    return [
      "ID",
      "Client ID",
      "Name",
      "Description",
      "Status",
      "Hourly Rate",
      "Budget",
      "Start Date",
      "End Date",
      "Created At",
      "Updated At",
      "Is Active",
    ];
  }

  private getTaskHeaders(): string[] {
    return [
      "ID",
      "Project ID",
      "Name",
      "Description",
      "Status",
      "Priority",
      "Estimated Hours",
      "Created At",
      "Updated At",
      "Is Active",
    ];
  }

  private getTimeEntryHeaders(): string[] {
    return [
      "ID",
      "Task ID",
      "Project ID",
      "Client ID",
      "Description",
      "Start Time",
      "End Time",
      "Duration (ms)",
      "Hourly Rate",
      "Total Amount",
      "Notes",
      "Created At",
      "Updated At",
      "Is Active",
    ];
  }

  private getSettingsHeaders(): string[] {
    return ["Key", "Value", "Description", "Type", "Updated At"];
  }

  // Conversion methods
  private clientToRow(client: Client): string[] {
    return [
      client.id,
      client.name,
      client.email || "",
      client.phone || "",
      client.address || "",
      client.notes || "",
      client.createdAt.toISOString(),
      client.updatedAt.toISOString(),
      client.isActive.toString(),
    ];
  }

  private rowToClient(row: string[]): Client {
    return {
      id: row[0],
      name: row[1],
      email: row[2] || undefined,
      phone: row[3] || undefined,
      address: row[4] || undefined,
      notes: row[5] || undefined,
      createdAt: new Date(row[6]),
      updatedAt: new Date(row[7]),
      isActive: row[8] === "true",
    };
  }

  private projectToRow(project: Project): string[] {
    return [
      project.id,
      project.clientId,
      project.name,
      project.description || "",
      project.status,
      project.hourlyRate?.toString() || "",
      project.budget?.toString() || "",
      project.startDate?.toISOString() || "",
      project.endDate?.toISOString() || "",
      project.createdAt.toISOString(),
      project.updatedAt.toISOString(),
      project.isActive.toString(),
    ];
  }

  private rowToProject(row: string[]): Project {
    return {
      id: row[0],
      clientId: row[1],
      name: row[2],
      description: row[3] || undefined,
      status: row[4] as Project["status"],
      hourlyRate: row[5] ? parseFloat(row[5]) : undefined,
      budget: row[6] ? parseFloat(row[6]) : undefined,
      startDate: row[7] ? new Date(row[7]) : undefined,
      endDate: row[8] ? new Date(row[8]) : undefined,
      createdAt: new Date(row[9]),
      updatedAt: new Date(row[10]),
      isActive: row[11] === "true",
    };
  }

  private taskToRow(task: Task): string[] {
    return [
      task.id,
      task.projectId,
      task.name,
      task.description || "",
      task.status,
      task.priority,
      task.estimatedHours?.toString() || "",
      task.createdAt.toISOString(),
      task.updatedAt.toISOString(),
      task.isActive ? "true" : "false",
    ];
  }

  private rowToTask(row: string[]): Task {
    try {
      // Add safety checks to prevent errors from incomplete rows
      if (!row || row.length < 10) {
        console.warn("Incomplete task row data:", row);
        console.warn("Row length:", row ? row.length : 0);
        // Return a default task with minimum required fields
        return {
          id: row[0] || `temp-${Date.now()}`,
          projectId: row[1] || "",
          name: row[2] || "Untitled Task",
          description: row[3] || undefined,
          status: (row[4] as Task["status"]) || "todo",
          priority: (row[5] as Task["priority"]) || "medium",
          estimatedHours: row[6] ? parseFloat(row[6]) : undefined,
          createdAt: row[7] ? new Date(row[7]) : new Date(),
          updatedAt: row[8] ? new Date(row[8]) : new Date(),
          isActive:
            row[9] === "true" ||
            row[9] === "1" ||
            row[9] === undefined ||
            row[9] === "" ||
            !row[9], // Default to true if isActive field is missing or falsy
        };
      }

      // Validate required fields
      if (!row[0] || !row[1] || !row[2]) {
        console.warn("Missing required task fields:", {
          id: row[0],
          projectId: row[1],
          name: row[2],
        });
        throw new Error("Missing required task fields");
      }

      // Validate status and priority values
      const validStatuses = ["todo", "in_progress", "completed", "cancelled"];
      const validPriorities = ["low", "medium", "high", "urgent"];

      const status = validStatuses.includes(row[4])
        ? (row[4] as Task["status"])
        : "todo";
      const priority = validPriorities.includes(row[5])
        ? (row[5] as Task["priority"])
        : "medium";

      const task: Task = {
        id: row[0],
        projectId: row[1],
        name: row[2],
        description: row[3] || undefined,
        status,
        priority,
        estimatedHours: row[6] ? parseFloat(row[6]) : undefined,
        createdAt: new Date(row[7]),
        updatedAt: new Date(row[8]),
        isActive:
          row[9] === "true" ||
          row[9] === "1" ||
          row[9] === undefined ||
          row[9] === "" ||
          !row[9], // Default to true if isActive field is missing or falsy
      };

      console.log("Successfully created task from row:", task);
      return task;
    } catch (error) {
      console.error("Error in rowToTask:", error);
      console.error("Problematic row:", row);
      // Return a safe default task
      return {
        id: `error-${Date.now()}`,
        projectId: "",
        name: "Error Task",
        description: "Error parsing task data",
        status: "todo",
        priority: "medium",
        estimatedHours: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: false,
      };
    }
  }

  private timeEntryToRow(entry: TimeEntry): string[] {
    return [
      entry.id,
      entry.taskId,
      entry.projectId,
      entry.clientId,
      entry.description,
      entry.startTime.toISOString(),
      entry.endTime?.toISOString() || "",
      entry.duration?.toString() || "",
      entry.hourlyRate?.toString() || "",
      entry.totalAmount?.toString() || "",
      entry.notes || "",
      entry.createdAt.toISOString(),
      entry.updatedAt.toISOString(),
      entry.isActive.toString(),
    ];
  }

  private rowToTimeEntry(row: string[]): TimeEntry {
    return {
      id: row[0],
      taskId: row[1],
      projectId: row[2],
      clientId: row[3],
      description: row[4],
      startTime: new Date(row[5]),
      endTime: row[6] ? new Date(row[6]) : undefined,
      duration: row[7] ? parseInt(row[7]) : undefined,
      hourlyRate: row[8] ? parseFloat(row[8]) : undefined,
      totalAmount: row[9] ? parseFloat(row[9]) : undefined,
      notes: row[10] || undefined,
      createdAt: new Date(row[11]),
      updatedAt: new Date(row[12]),
      isActive: row[13] === "true",
    };
  }

  // Initialize configuration data in the spreadsheet
  private async initializeConfigurationData(): Promise<void> {
    try {
      console.log("Initializing configuration data in Settings tab");

      // Set up basic configuration in Settings sheet
      const defaultSettings = {
        appName: "ThisTracker",
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        dataStructureVersion: "1.0.0",
        collections: {
          clients: this.config.clientsSheetName,
          projects: this.config.projectsSheetName,
          tasks: this.config.tasksSheetName,
          timeEntries: "TimeEntries-{YYYY-MM}",
        },
      };

      await this.syncSettings(defaultSettings);
      console.log("Configuration data initialized successfully");
    } catch (error) {
      console.error("Error initializing configuration data:", error);
      // Non-critical error, don't throw
    }
  }

  // Delete the default "Sheet1" that Google Sheets creates
  private async deleteDefaultSheet(): Promise<void> {
    try {
      console.log("Attempting to delete default 'Sheet1'");

      // Get the spreadsheet to find all sheets
      const spreadsheet = await this.sheetsAPI.getSpreadsheet(
        this.config.spreadsheetId
      );

      if (spreadsheet.sheets) {
        const defaultSheet = spreadsheet.sheets.find(
          (sheet: { properties?: { title?: string; sheetId?: number } }) =>
            sheet.properties?.title === "Sheet1"
        );

        if (defaultSheet) {
          const sheetId = defaultSheet.properties.sheetId;
          console.log("Found default Sheet1 with ID:", sheetId);

          // Delete the default sheet
          const deleteRequest = {
            deleteSheet: {
              sheetId: sheetId,
            },
          };

          await this.sheetsAPI.batchUpdate(this.config.spreadsheetId, [
            deleteRequest,
          ]);
          console.log("Successfully deleted default Sheet1");
        } else {
          console.log(
            "Default Sheet1 not found (may have been already deleted)"
          );
        }
      }
    } catch (error) {
      console.warn(
        "Could not delete default Sheet1 (this is usually fine):",
        error
      );
      // Non-critical error, don't throw
    }
  }

  // Ensure spreadsheet integrity (verify all required tabs exist)
  async verifySpreadsheetIntegrity(): Promise<boolean> {
    try {
      console.log("Verifying spreadsheet integrity");

      const spreadsheet = await this.sheetsAPI.getSpreadsheet(
        this.config.spreadsheetId
      );
      const existingSheets =
        spreadsheet.sheets?.map(
          (sheet: { properties?: { title?: string } }) =>
            sheet.properties?.title
        ) || [];

      const requiredSheets = [
        this.config.clientsSheetName,
        this.config.projectsSheetName,
        this.config.tasksSheetName,
        "Settings",
      ];

      const missingSheets = requiredSheets.filter(
        (sheet) => !existingSheets.includes(sheet)
      );

      if (missingSheets.length > 0) {
        console.log("Missing required sheets:", missingSheets);

        // Create missing sheets
        for (const sheetName of missingSheets) {
          let headers: string[];
          switch (sheetName) {
            case this.config.clientsSheetName:
              headers = this.getClientHeaders();
              break;
            case this.config.projectsSheetName:
              headers = this.getProjectHeaders();
              break;
            case this.config.tasksSheetName:
              headers = this.getTaskHeaders();
              break;
            case "Settings":
              headers = this.getSettingsHeaders();
              break;
            default:
              headers = ["ID", "Name", "Created At"];
          }

          await this.createSheetWithHeaders(sheetName, headers);
        }

        console.log("Created missing sheets, integrity restored");
      } else {
        console.log("All required sheets exist, integrity verified");
      }

      return true;
    } catch (error) {
      console.error("Error verifying spreadsheet integrity:", error);
      return false;
    }
  }

  // Get spreadsheet metadata including all tabs
  async getSpreadsheetMetadata(): Promise<{
    spreadsheetId: string;
    title: string;
    sheets: Array<{
      title: string;
      sheetId: number;
      gridProperties?: { rowCount?: number; columnCount?: number };
    }>;
    url: string;
  }> {
    try {
      const spreadsheet = await this.sheetsAPI.getSpreadsheet(
        this.config.spreadsheetId
      );

      return {
        spreadsheetId: this.config.spreadsheetId,
        title: spreadsheet.properties?.title || "ThisTracker",
        sheets:
          spreadsheet.sheets?.map(
            (sheet: {
              properties?: {
                title?: string;
                sheetId?: number;
                gridProperties?: { rowCount?: number; columnCount?: number };
              };
            }) => ({
              title: sheet.properties?.title || "Unknown",
              sheetId: sheet.properties?.sheetId || 0,
              gridProperties: sheet.properties?.gridProperties,
            })
          ) || [],
        url: `https://docs.google.com/spreadsheets/d/${this.config.spreadsheetId}/edit`,
      };
    } catch (error) {
      console.error("Error getting spreadsheet metadata:", error);
      throw error;
    }
  }
}
