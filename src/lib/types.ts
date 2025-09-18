// Data models for ThisTracker

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  status: "active" | "paused" | "completed" | "cancelled";
  hourlyRate?: number;
  budget?: number;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: "todo" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  estimatedHours?: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  projectId: string;
  clientId: string;
  description: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in milliseconds
  hourlyRate?: number;
  totalAmount?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// Google Sheets configuration
export interface SheetsConfig {
  spreadsheetId: string;
  clientsSheetName: string;
  projectsSheetName: string;
  tasksSheetName: string;
  timeEntriesSheetName: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  error?: string;
}

// Form types for UI
export interface ClientFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface ProjectFormData {
  clientId: string;
  name: string;
  description?: string;
  status: "active" | "paused" | "completed" | "cancelled";
  hourlyRate?: number;
  budget?: number;
  startDate?: string;
  endDate?: string;
}

export interface TaskFormData {
  projectId: string;
  name: string;
  description?: string;
  status: "todo" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  estimatedHours?: number;
}

export interface TimeEntryFormData {
  taskId: string;
  description: string;
  startTime: string;
  endTime?: string;
  hourlyRate?: number;
  notes?: string;
}
