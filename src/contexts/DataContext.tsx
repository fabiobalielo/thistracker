"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { Client, Project, Task, TimeEntry } from "@/lib/types";

interface DataContextType {
  // Data
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  timeEntries: TimeEntry[];

  // Loading states
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;

  // Actions
  syncData: () => Promise<void>;
  refreshClients: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshTimeEntries: () => Promise<void>;
  syncAfterUpdate: () => Promise<void>;

  // Optimistic updates
  addClient: (client: Client) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  removeClient: (id: string) => void;

  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;

  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;

  addTimeEntry: (timeEntry: TimeEntry) => void;
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>) => void;
  removeTimeEntry: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const { data: session, status } = useSession();
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear all data (used when user logs out)
  const clearData = useCallback(() => {
    console.log("DataContext: Clearing all data due to logout");
    setClients([]);
    setProjects([]);
    setTasks([]);
    setTimeEntries([]);
    setError(null);
    setIsLoading(false);
  }, []);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    // Don't fetch data if user is not authenticated
    if (status === "unauthenticated" || !session) {
      console.log("DataContext: User not authenticated, clearing data");
      clearData();
      return;
    }

    // Don't fetch if session is still loading
    if (status !== "authenticated") {
      console.log("DataContext: Session not authenticated, skipping fetch");
      return;
    }

    try {
      console.log(
        "DataContext: Starting to fetch data from single endpoint..."
      );

      const response = await fetch("/api/data");

      console.log("DataContext: API response received:", {
        status: response.status,
        ok: response.ok,
      });

      // Check for authentication errors
      if (response.status === 401) {
        console.error(
          "DataContext: Authentication error detected, clearing data"
        );
        clearData();
        return;
      }

      if (!response.ok) {
        console.error("DataContext: API response not OK:", {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
        });

        let errorMessage = "Failed to fetch data";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error("DataContext: Error data:", errorData);
        } catch (jsonError) {
          console.error(
            "DataContext: Failed to parse error response as JSON:",
            jsonError
          );
          // Try to get the response as text
          try {
            const errorText = await response.text();
            console.error("DataContext: Error response text:", errorText);
            errorMessage = `HTTP ${response.status}: ${errorText}`;
          } catch (textError) {
            console.error(
              "DataContext: Failed to get error response as text:",
              textError
            );
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      console.log("DataContext: Parsed data:", {
        clients: data.clients,
        projects: data.projects,
        tasks: data.tasks,
        timeEntries: data.timeEntries,
      });

      setClients(Array.isArray(data.clients) ? data.clients : []);
      setProjects(Array.isArray(data.projects) ? data.projects : []);
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      setTimeEntries(Array.isArray(data.timeEntries) ? data.timeEntries : []);
      setError(null);

      console.log("DataContext: Data set in state");
    } catch (error) {
      console.error("DataContext: Error fetching data:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch data");
    }
  }, [status, session, clearData]);

  // Sync all data
  const syncData = async () => {
    setIsSyncing(true);
    try {
      await fetchData();
    } finally {
      setIsSyncing(false);
    }
  };

  // Individual refresh functions - all use the single endpoint for consistency
  const refreshClients = async () => {
    if (status === "unauthenticated" || !session) {
      console.log(
        "DataContext: User not authenticated, skipping client refresh"
      );
      return;
    }

    try {
      const response = await fetch("/api/data");
      if (!response.ok) {
        if (response.status === 401) {
          clearData();
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setClients(Array.isArray(data.clients) ? data.clients : []);
    } catch (error) {
      console.error("Error refreshing clients:", error);
    }
  };

  const refreshProjects = async () => {
    if (status === "unauthenticated" || !session) {
      console.log(
        "DataContext: User not authenticated, skipping project refresh"
      );
      return;
    }

    try {
      const response = await fetch("/api/data");
      if (!response.ok) {
        if (response.status === 401) {
          clearData();
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch (error) {
      console.error("Error refreshing projects:", error);
    }
  };

  const refreshTasks = async () => {
    if (status === "unauthenticated" || !session) {
      console.log("DataContext: User not authenticated, skipping task refresh");
      return;
    }

    try {
      const response = await fetch("/api/data");
      if (!response.ok) {
        if (response.status === 401) {
          clearData();
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (error) {
      console.error("Error refreshing tasks:", error);
    }
  };

  const refreshTimeEntries = async () => {
    if (status === "unauthenticated" || !session) {
      console.log(
        "DataContext: User not authenticated, skipping time entry refresh"
      );
      return;
    }

    try {
      const response = await fetch("/api/data");
      if (!response.ok) {
        if (response.status === 401) {
          clearData();
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setTimeEntries(Array.isArray(data.timeEntries) ? data.timeEntries : []);
    } catch (error) {
      console.error("Error refreshing time entries:", error);
    }
  };

  // Optimistic updates for clients
  const addClient = (client: Client) => {
    setClients((prev) => [...prev, client]);
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients((prev) =>
      prev.map((client) =>
        client.id === id ? { ...client, ...updates } : client
      )
    );
  };

  const removeClient = (id: string) => {
    setClients((prev) => prev.filter((client) => client.id !== id));
  };

  // Background sync after optimistic updates
  const syncAfterUpdate = async () => {
    try {
      console.log("DataContext: Syncing after optimistic update...");
      await fetchData();
    } catch (error) {
      console.error("DataContext: Background sync failed:", error);
      // Could show a toast notification here
    }
  };

  // Optimistic updates for projects
  const addProject = (project: Project) => {
    setProjects((prev) => [...prev, project]);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === id ? { ...project, ...updates } : project
      )
    );
  };

  const removeProject = (id: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== id));
  };

  // Optimistic updates for tasks
  const addTask = (task: Task) => {
    setTasks((prev) => [...prev, task]);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...updates } : task))
    );
  };

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  // Optimistic updates for time entries
  const addTimeEntry = (timeEntry: TimeEntry) => {
    setTimeEntries((prev) => [...prev, timeEntry]);
  };

  const updateTimeEntry = (id: string, updates: Partial<TimeEntry>) => {
    setTimeEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry))
    );
  };

  const removeTimeEntry = (id: string) => {
    setTimeEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  // Handle session changes and data loading
  useEffect(() => {
    const handleSessionChange = async () => {
      console.log("DataContext: Session status changed:", status);

      if (status !== "authenticated") {
        if (status === "loading") {
          console.log("DataContext: Session loading, setting loading state");
          setIsLoading(true);
        } else {
          console.log("DataContext: User not authenticated, clearing data");
          clearData();
        }
        return;
      }

      if (session) {
        console.log("DataContext: User authenticated, loading data");
        setIsLoading(true);
        await fetchData();
        setIsLoading(false);
      }
    };

    handleSessionChange();
  }, [status, session, fetchData]);

  const value: DataContextType = {
    // Data
    clients,
    projects,
    tasks,
    timeEntries,

    // Loading states
    isLoading,
    isSyncing,
    error,

    // Actions
    syncData,
    refreshClients,
    refreshProjects,
    refreshTasks,
    refreshTimeEntries,
    syncAfterUpdate,

    // Optimistic updates
    addClient,
    updateClient,
    removeClient,
    addProject,
    updateProject,
    removeProject,
    addTask,
    updateTask,
    removeTask,
    addTimeEntry,
    updateTimeEntry,
    removeTimeEntry,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
