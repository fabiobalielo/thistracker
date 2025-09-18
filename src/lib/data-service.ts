import { SheetsSyncService } from "./sheets-sync";
import { GoogleSheetsAPI, GoogleDriveAPI } from "./google-apis";
import {
  Client,
  Project,
  Task,
  TimeEntry,
  ClientFormData,
  ProjectFormData,
  TaskFormData,
  TimeEntryFormData,
  ApiResponse,
  PaginatedResponse,
} from "./types";

export class DataService {
  private sheetsSync: SheetsSyncService;
  private config = {
    spreadsheetId: "",
    clientsSheetName: "Clients",
    projectsSheetName: "Projects",
    tasksSheetName: "Tasks",
    timeEntriesSheetName: "Time Entries",
  };

  constructor(sheetsAPI: GoogleSheetsAPI, driveAPI: GoogleDriveAPI) {
    this.sheetsSync = new SheetsSyncService(sheetsAPI, driveAPI, this.config);
  }

  async initialize(): Promise<void> {
    try {
      console.log("Initializing DataService with Google Sheets integration");
      const config = await this.sheetsSync.initializeSpreadsheet();
      this.config = config;

      // Verify spreadsheet integrity after initialization
      const isIntact = await this.sheetsSync.verifySpreadsheetIntegrity();
      if (!isIntact) {
        console.warn("Spreadsheet integrity check failed, but continuing...");
      }

      console.log(
        "DataService initialized successfully with spreadsheet:",
        this.config.spreadsheetId
      );
    } catch (error) {
      console.error("Error initializing DataService:", error);
      throw error;
    }
  }

  // Client operations
  async createClient(data: ClientFormData): Promise<ApiResponse<Client>> {
    try {
      const client: Client = {
        id: this.generateId(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      console.log("Creating client:", client);

      const clients = await this.sheetsSync.getClients();
      console.log("Existing clients:", clients);

      clients.push(client);
      console.log("Updated clients array:", clients);

      await this.sheetsSync.syncClients(clients);
      console.log("Clients synced to Google Sheets");

      return { success: true, data: client };
    } catch (error) {
      console.error("Error in createClient:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getClients(): Promise<ApiResponse<Client[]>> {
    try {
      const clients = await this.sheetsSync.getClients();
      return { success: true, data: clients };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateClient(
    id: string,
    data: Partial<ClientFormData>
  ): Promise<ApiResponse<Client>> {
    try {
      const clients = await this.sheetsSync.getClients();
      const index = clients.findIndex((c) => c.id === id);

      if (index === -1) {
        return { success: false, error: "Client not found" };
      }

      clients[index] = {
        ...clients[index],
        ...data,
        updatedAt: new Date(),
      };

      await this.sheetsSync.syncClients(clients);
      return { success: true, data: clients[index] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async deleteClient(id: string): Promise<ApiResponse<void>> {
    try {
      const clients = await this.sheetsSync.getClients();
      const filteredClients = clients.filter((c) => c.id !== id);
      await this.sheetsSync.syncClients(filteredClients);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Project operations
  async createProject(data: ProjectFormData): Promise<ApiResponse<Project>> {
    try {
      console.log("DataService: Creating project with data:", data);

      const project: Project = {
        id: this.generateId(),
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      console.log("DataService: Generated project object:", project);

      console.log("DataService: Getting existing projects...");
      const projects = await this.sheetsSync.getProjects();
      console.log(
        "DataService: Retrieved",
        projects.length,
        "existing projects"
      );

      projects.push(project);
      console.log(
        "DataService: Added new project, now have",
        projects.length,
        "projects"
      );

      console.log("DataService: Syncing projects to Google Sheets...");
      await this.sheetsSync.syncProjects(projects);
      console.log("DataService: Projects synced successfully");

      return { success: true, data: project };
    } catch (error) {
      console.error("DataService: Error creating project:", error);
      console.error(
        "DataService: Error stack:",
        error instanceof Error ? error.stack : "No stack"
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getProjects(clientId?: string): Promise<ApiResponse<Project[]>> {
    try {
      const projects = await this.sheetsSync.getProjects();
      const filteredProjects = clientId
        ? projects.filter((p) => p.clientId === clientId)
        : projects;
      return { success: true, data: filteredProjects };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateProject(
    id: string,
    data: Partial<ProjectFormData>
  ): Promise<ApiResponse<Project>> {
    try {
      const projects = await this.sheetsSync.getProjects();
      const index = projects.findIndex((p) => p.id === id);

      if (index === -1) {
        return { success: false, error: "Project not found" };
      }

      projects[index] = {
        ...projects[index],
        ...data,
        startDate: data.startDate
          ? new Date(data.startDate)
          : projects[index].startDate,
        endDate: data.endDate
          ? new Date(data.endDate)
          : projects[index].endDate,
        updatedAt: new Date(),
      };

      await this.sheetsSync.syncProjects(projects);
      return { success: true, data: projects[index] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async deleteProject(id: string): Promise<ApiResponse<void>> {
    try {
      const projects = await this.sheetsSync.getProjects();
      const filteredProjects = projects.filter((p) => p.id !== id);
      await this.sheetsSync.syncProjects(filteredProjects);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Task operations
  async createTask(data: TaskFormData): Promise<ApiResponse<Task>> {
    try {
      const task: Task = {
        id: this.generateId(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      console.log("Creating task:", task);

      // Get ALL existing tasks (not just for this project)
      const existingTasks = await this.sheetsSync.getTasks();
      console.log("Total existing tasks:", existingTasks.length);

      // Add the new task to all existing tasks
      const allTasks = [...existingTasks, task];
      console.log("Total tasks after adding new one:", allTasks.length);

      // Sync all tasks to Google Sheets
      await this.sheetsSync.syncTasks(allTasks);
      console.log("Task synced to Google Sheets successfully");

      return { success: true, data: task };
    } catch (error) {
      console.error("Error in createTask:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getTasks(projectId?: string): Promise<ApiResponse<Task[]>> {
    try {
      console.log(
        `Getting tasks${
          projectId ? ` for project ${projectId}` : " (all projects)"
        }`
      );
      const tasks = await this.sheetsSync.getTasks({ projectId });
      console.log(`Retrieved ${tasks.length} tasks from Google Sheets`);
      return { success: true, data: tasks };
    } catch (error) {
      console.error("Error in getTasks:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateTask(
    id: string,
    data: Partial<TaskFormData>
  ): Promise<ApiResponse<Task>> {
    try {
      const tasks = await this.sheetsSync.getTasks();
      const index = tasks.findIndex((t) => t.id === id);

      if (index === -1) {
        return { success: false, error: "Task not found" };
      }

      tasks[index] = {
        ...tasks[index],
        ...data,
        updatedAt: new Date(),
      };

      await this.sheetsSync.syncTasks(tasks);
      return { success: true, data: tasks[index] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async deleteTask(id: string): Promise<ApiResponse<void>> {
    try {
      const tasks = await this.sheetsSync.getTasks();
      const filteredTasks = tasks.filter((t) => t.id !== id);
      await this.sheetsSync.syncTasks(filteredTasks);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Time Entry operations
  async createTimeEntry(
    data: TimeEntryFormData
  ): Promise<ApiResponse<TimeEntry>> {
    try {
      // Get project and client info
      const projects = await this.sheetsSync.getProjects();
      const tasks = await this.sheetsSync.getTasks();

      const task = tasks.find((t) => t.id === data.taskId);
      if (!task) {
        return { success: false, error: "Task not found" };
      }

      const project = projects.find((p) => p.id === task.projectId);
      if (!project) {
        return { success: false, error: "Project not found" };
      }

      const startTime = new Date(data.startTime);
      const endTime = data.endTime ? new Date(data.endTime) : undefined;
      const duration = endTime
        ? endTime.getTime() - startTime.getTime()
        : undefined;
      const hourlyRate = data.hourlyRate || project.hourlyRate;
      const totalAmount =
        duration && hourlyRate
          ? (duration / (1000 * 60 * 60)) * hourlyRate
          : undefined;

      const timeEntry: TimeEntry = {
        id: this.generateId(),
        taskId: data.taskId,
        projectId: task.projectId,
        clientId: project.clientId,
        description: data.description,
        startTime,
        endTime,
        duration,
        hourlyRate,
        totalAmount,
        notes: data.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      const timeEntries = await this.sheetsSync.getTimeEntries();
      timeEntries.push(timeEntry);
      await this.sheetsSync.syncTimeEntries(timeEntries);

      return { success: true, data: timeEntry };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getTimeEntries(filters?: {
    clientId?: string;
    projectId?: string;
    taskId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    page?: number;
  }): Promise<ApiResponse<TimeEntry[]>> {
    try {
      const timeEntries = await this.sheetsSync.getTimeEntries({
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        limit: filters?.limit || 1000,
        page: filters?.page || 1,
      });

      let filteredEntries = timeEntries;

      if (filters) {
        if (filters.clientId) {
          filteredEntries = filteredEntries.filter(
            (e) => e.clientId === filters.clientId
          );
        }
        if (filters.projectId) {
          filteredEntries = filteredEntries.filter(
            (e) => e.projectId === filters.projectId
          );
        }
        if (filters.taskId) {
          filteredEntries = filteredEntries.filter(
            (e) => e.taskId === filters.taskId
          );
        }
      }

      return { success: true, data: filteredEntries };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateTimeEntry(
    id: string,
    data: Partial<TimeEntryFormData>
  ): Promise<ApiResponse<TimeEntry>> {
    try {
      const timeEntries = await this.sheetsSync.getTimeEntries();
      const index = timeEntries.findIndex((e) => e.id === id);

      if (index === -1) {
        return { success: false, error: "Time entry not found" };
      }

      const entry = timeEntries[index];
      const updatedEntry = {
        ...entry,
        ...data,
        startTime: data.startTime ? new Date(data.startTime) : entry.startTime,
        endTime: data.endTime ? new Date(data.endTime) : entry.endTime,
        updatedAt: new Date(),
      };

      // Recalculate duration and amount if times changed
      if (data.startTime || data.endTime) {
        const startTime = updatedEntry.startTime;
        const endTime = updatedEntry.endTime;

        if (endTime) {
          updatedEntry.duration = endTime.getTime() - startTime.getTime();
          if (updatedEntry.hourlyRate) {
            updatedEntry.totalAmount =
              (updatedEntry.duration / (1000 * 60 * 60)) *
              updatedEntry.hourlyRate;
          }
        }
      }

      timeEntries[index] = updatedEntry;
      await this.sheetsSync.syncTimeEntries(timeEntries);

      return { success: true, data: updatedEntry };
    } catch (error) {
      console.error("Error in updateTimeEntry:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async deleteTimeEntry(id: string): Promise<ApiResponse<void>> {
    try {
      const timeEntries = await this.sheetsSync.getTimeEntries();
      const filteredEntries = timeEntries.filter((e) => e.id !== id);
      await this.sheetsSync.syncTimeEntries(filteredEntries);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Settings operations
  async getSettings(): Promise<ApiResponse<Record<string, unknown>>> {
    try {
      const settings = await this.sheetsSync.getSettings();
      return { success: true, data: settings };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateSettings(
    settings: Record<string, unknown>
  ): Promise<ApiResponse<void>> {
    try {
      await this.sheetsSync.syncSettings(settings);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Utility methods
  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // Get related data for UI
  async getClientWithProjects(
    clientId: string
  ): Promise<ApiResponse<{ client: Client; projects: Project[] }>> {
    try {
      const [clientsResponse, projectsResponse] = await Promise.all([
        this.getClients(),
        this.getProjects(clientId),
      ]);

      if (!clientsResponse.success || !projectsResponse.success) {
        return { success: false, error: "Failed to fetch data" };
      }

      const client = clientsResponse.data!.find((c) => c.id === clientId);
      if (!client) {
        return { success: false, error: "Client not found" };
      }

      return {
        success: true,
        data: { client, projects: projectsResponse.data! },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getProjectWithTasks(
    projectId: string
  ): Promise<ApiResponse<{ project: Project; tasks: Task[] }>> {
    try {
      const [projectsResponse, tasksResponse] = await Promise.all([
        this.getProjects(),
        this.getTasks(projectId),
      ]);

      if (!projectsResponse.success || !tasksResponse.success) {
        return { success: false, error: "Failed to fetch data" };
      }

      const project = projectsResponse.data!.find((p) => p.id === projectId);
      if (!project) {
        return { success: false, error: "Project not found" };
      }

      return { success: true, data: { project, tasks: tasksResponse.data! } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Google Sheets management operations
  async getSpreadsheetInfo(): Promise<
    ApiResponse<{
      spreadsheetId: string;
      title: string;
      sheets: Array<{
        title: string;
        sheetId: number;
        gridProperties?: unknown;
      }>;
      url: string;
    }>
  > {
    try {
      const metadata = await this.sheetsSync.getSpreadsheetMetadata();
      return { success: true, data: metadata };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async verifyIntegrity(): Promise<
    ApiResponse<{ isIntact: boolean; message: string }>
  > {
    try {
      const isIntact = await this.sheetsSync.verifySpreadsheetIntegrity();
      return {
        success: true,
        data: {
          isIntact,
          message: isIntact
            ? "All required tabs (Clients, Projects, Tasks, Settings) are present and accessible."
            : "Some required tabs are missing or inaccessible. They have been recreated.",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Get comprehensive data overview for dashboard
  async getDataOverview(): Promise<
    ApiResponse<{
      spreadsheetInfo: unknown;
      counts: {
        clients: number;
        projects: number;
        tasks: number;
        timeEntries: number;
      };
      recentActivity: {
        lastClient?: Date;
        lastProject?: Date;
        lastTask?: Date;
        lastTimeEntry?: Date;
      };
    }>
  > {
    try {
      const [
        spreadsheetResponse,
        clientsResponse,
        projectsResponse,
        tasksResponse,
        timeEntriesResponse,
      ] = await Promise.all([
        this.getSpreadsheetInfo(),
        this.getClients(),
        this.getProjects(),
        this.getTasks(),
        this.getTimeEntries({ limit: 100 }),
      ]);

      if (!spreadsheetResponse.success) {
        return { success: false, error: "Failed to get spreadsheet info" };
      }

      const clients = clientsResponse.success ? clientsResponse.data! : [];
      const projects = projectsResponse.success ? projectsResponse.data! : [];
      const tasks = tasksResponse.success ? tasksResponse.data! : [];
      const timeEntries = timeEntriesResponse.success
        ? timeEntriesResponse.data!
        : [];

      // Calculate recent activity
      const recentActivity = {
        lastClient:
          clients.length > 0
            ? new Date(Math.max(...clients.map((c) => c.updatedAt.getTime())))
            : undefined,
        lastProject:
          projects.length > 0
            ? new Date(Math.max(...projects.map((p) => p.updatedAt.getTime())))
            : undefined,
        lastTask:
          tasks.length > 0
            ? new Date(Math.max(...tasks.map((t) => t.updatedAt.getTime())))
            : undefined,
        lastTimeEntry:
          timeEntries.length > 0
            ? new Date(
                Math.max(...timeEntries.map((e) => e.updatedAt.getTime()))
              )
            : undefined,
      };

      return {
        success: true,
        data: {
          spreadsheetInfo: spreadsheetResponse.data,
          counts: {
            clients: clients.length,
            projects: projects.length,
            tasks: tasks.length,
            timeEntries: timeEntries.length,
          },
          recentActivity,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
