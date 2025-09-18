"use client";

import { useState } from "react";
import { Task } from "@/lib/types";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import AppLayout from "@/components/AppLayout";
import {
  ClockIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

export default function TasksPage() {
  const {
    clients,
    projects: allProjects,
    tasks,
    isLoading,
    error,
    addTask,
    updateTask,
    removeTask,
    syncAfterUpdate,
  } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [showAddTask, setShowAddTask] = useState(false);
  const [showEditTask, setShowEditTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    projectId: "",
    name: "",
    description: "",
    status: "todo" as "todo" | "in_progress" | "completed" | "cancelled",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    estimatedHours: "",
  });
  const [editTask, setEditTask] = useState({
    projectId: "",
    name: "",
    description: "",
    status: "todo" as "todo" | "in_progress" | "completed" | "cancelled",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    estimatedHours: "",
  });

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.name.trim() || !newTask.projectId) return;

    // Store the form data before clearing it
    const taskData = {
      ...newTask,
      estimatedHours: newTask.estimatedHours
        ? parseFloat(newTask.estimatedHours)
        : null,
    };

    // Create optimistic task data
    const optimisticTask: Task = {
      id: `temp-${Date.now()}`, // Temporary ID
      projectId: newTask.projectId,
      name: newTask.name,
      description: newTask.description,
      status: newTask.status,
      priority: newTask.priority,
      estimatedHours: newTask.estimatedHours
        ? parseFloat(newTask.estimatedHours)
        : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    // Update UI immediately (optimistic update)
    addTask(optimisticTask);

    // Clear form and close dialog immediately
    setNewTask({
      projectId: "",
      name: "",
      description: "",
      status: "todo",
      priority: "medium",
      estimatedHours: "",
    });
    setShowAddTask(false);

    // Sync with server in background
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        const taskData = await response.json();
        // Update with real data from server
        updateTask(optimisticTask.id, taskData);
        // Trigger background sync to ensure consistency
        syncAfterUpdate();
      } else {
        // If server call fails, remove the optimistic update
        removeTask(optimisticTask.id);
        alert("Failed to create task. Please try again.");
      }
    } catch (error) {
      console.error("Error creating task:", error);
      // Remove the optimistic update on error
      removeTask(optimisticTask.id);
      alert("Failed to create task. Please try again.");
    }
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTask.name.trim() || !editTask.projectId) return;

    // Store original data for rollback
    const originalTask = { ...editingTask };

    // Update UI immediately (optimistic update)
    updateTask(editingTask.id, {
      projectId: editTask.projectId,
      name: editTask.name,
      description: editTask.description,
      status: editTask.status,
      priority: editTask.priority,
      estimatedHours: editTask.estimatedHours
        ? parseFloat(editTask.estimatedHours)
        : undefined,
      updatedAt: new Date(),
    });

    // Close dialog immediately
    setShowEditTask(false);
    setEditingTask(null);
    setEditTask({
      projectId: "",
      name: "",
      description: "",
      status: "todo",
      priority: "medium",
      estimatedHours: "",
    });

    // Sync with server in background
    try {
      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editTask,
          estimatedHours: editTask.estimatedHours
            ? parseFloat(editTask.estimatedHours)
            : null,
        }),
      });

      if (response.ok) {
        const taskData = await response.json();
        // Update with real data from server
        updateTask(editingTask.id, taskData);
        // Trigger background sync to ensure consistency
        syncAfterUpdate();
      } else {
        // If server call fails, rollback to original data
        updateTask(editingTask.id, originalTask);
        alert("Failed to update task. Please try again.");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      // Rollback to original data on error
      updateTask(editingTask.id, originalTask);
      alert("Failed to update task. Please try again.");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this task? This action cannot be undone."
      )
    ) {
      return;
    }

    // Store task data for rollback
    const taskToDelete = tasks.find((t) => t.id === taskId);
    if (!taskToDelete) return;

    // Update UI immediately (optimistic update)
    removeTask(taskId);

    // Sync with server in background
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Trigger background sync to ensure consistency
        syncAfterUpdate();
      } else {
        // If server call fails, restore the task
        addTask(taskToDelete);
        alert("Failed to delete task. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      // Restore the task on error
      addTask(taskToDelete);
      alert("Failed to delete task. Please try again.");
    }
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setEditTask({
      projectId: task.projectId,
      name: task.name,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      estimatedHours: task.estimatedHours?.toString() || "",
    });
    setShowEditTask(true);
  };

  // Filter tasks based on search and filters
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || task.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || task.priority === priorityFilter;
    const matchesProject =
      projectFilter === "all" || task.projectId === projectFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesProject;
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="glass p-8 rounded-tahoe-xl">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-macaw-red-500 mx-auto"></div>
            <p className="mt-4 text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark text-center">
              Loading tasks...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="glass p-8 rounded-tahoe-xl text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark mb-2">
              Error Loading Data
            </h2>
            <p className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark mb-4">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="tahoe-button-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark mb-2">
              Tasks
            </h1>
            <p className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
              Manage your tasks and track progress
            </p>
          </div>

          {/* Tasks Table */}
          <Card className="glass bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <CardTitle className="text-xl text-card-foreground">
                  Tasks
                </CardTitle>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                  <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center space-x-2">
                        <PlusIcon className="h-4 w-4" />
                        <span>Add Task</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle className="text-card-foreground">
                          Add New Task
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddTask} className="space-y-4">
                        <div>
                          <Label
                            htmlFor="task-name"
                            className="text-card-foreground"
                          >
                            Task Name *
                          </Label>
                          <Input
                            id="task-name"
                            type="text"
                            value={newTask.name}
                            onChange={(e) =>
                              setNewTask({
                                ...newTask,
                                name: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="Enter task name"
                            required
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="task-project"
                            className="text-card-foreground"
                          >
                            Project *
                          </Label>
                          <Select
                            value={newTask.projectId}
                            onValueChange={(value) =>
                              setNewTask({
                                ...newTask,
                                projectId: value,
                              })
                            }
                          >
                            <SelectTrigger className="bg-background border-border mt-1">
                              <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                            <SelectContent>
                              {allProjects.map((project) => {
                                const client = clients.find(
                                  (c) => c.id === project.clientId
                                );
                                return (
                                  <SelectItem
                                    key={project.id}
                                    value={project.id}
                                  >
                                    {project.name}{" "}
                                    {client ? `(${client.name})` : ""}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label
                            htmlFor="task-description"
                            className="text-card-foreground"
                          >
                            Description
                          </Label>
                          <Textarea
                            id="task-description"
                            value={newTask.description}
                            onChange={(
                              e: React.ChangeEvent<HTMLTextAreaElement>
                            ) =>
                              setNewTask({
                                ...newTask,
                                description: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="Enter task description"
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label
                              htmlFor="task-status"
                              className="text-card-foreground"
                            >
                              Status
                            </Label>
                            <Select
                              value={newTask.status}
                              onValueChange={(
                                value:
                                  | "todo"
                                  | "in_progress"
                                  | "completed"
                                  | "cancelled"
                              ) =>
                                setNewTask({
                                  ...newTask,
                                  status: value,
                                })
                              }
                            >
                              <SelectTrigger className="bg-background border-border mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="todo">To Do</SelectItem>
                                <SelectItem value="in_progress">
                                  In Progress
                                </SelectItem>
                                <SelectItem value="completed">
                                  Completed
                                </SelectItem>
                                <SelectItem value="cancelled">
                                  Cancelled
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label
                              htmlFor="task-priority"
                              className="text-card-foreground"
                            >
                              Priority
                            </Label>
                            <Select
                              value={newTask.priority}
                              onValueChange={(
                                value: "low" | "medium" | "high" | "urgent"
                              ) =>
                                setNewTask({
                                  ...newTask,
                                  priority: value,
                                })
                              }
                            >
                              <SelectTrigger className="bg-background border-border mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label
                            htmlFor="task-hours"
                            className="text-card-foreground"
                          >
                            Estimated Hours (optional)
                          </Label>
                          <Input
                            id="task-hours"
                            type="number"
                            value={newTask.estimatedHours}
                            onChange={(e) =>
                              setNewTask({
                                ...newTask,
                                estimatedHours: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="0.0"
                            step="0.5"
                            min="0"
                          />
                        </div>

                        <div className="flex space-x-3 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAddTask(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button type="submit" className="flex-1">
                            Create Task
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Edit Task Dialog */}
                  <Dialog open={showEditTask} onOpenChange={setShowEditTask}>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle className="text-card-foreground">
                          Edit Task
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleEditTask} className="space-y-4">
                        <div>
                          <Label
                            htmlFor="edit-task-name"
                            className="text-card-foreground"
                          >
                            Task Name *
                          </Label>
                          <Input
                            id="edit-task-name"
                            type="text"
                            value={editTask.name}
                            onChange={(e) =>
                              setEditTask({
                                ...editTask,
                                name: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="Enter task name"
                            required
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="edit-task-project"
                            className="text-card-foreground"
                          >
                            Project *
                          </Label>
                          <Select
                            value={editTask.projectId}
                            onValueChange={(value) =>
                              setEditTask({
                                ...editTask,
                                projectId: value,
                              })
                            }
                          >
                            <SelectTrigger className="bg-background border-border mt-1">
                              <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                            <SelectContent>
                              {allProjects.map((project) => {
                                const client = clients.find(
                                  (c) => c.id === project.clientId
                                );
                                return (
                                  <SelectItem
                                    key={project.id}
                                    value={project.id}
                                  >
                                    {project.name}{" "}
                                    {client ? `(${client.name})` : ""}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label
                            htmlFor="edit-task-description"
                            className="text-card-foreground"
                          >
                            Description
                          </Label>
                          <Textarea
                            id="edit-task-description"
                            value={editTask.description}
                            onChange={(
                              e: React.ChangeEvent<HTMLTextAreaElement>
                            ) =>
                              setEditTask({
                                ...editTask,
                                description: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="Enter task description"
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label
                              htmlFor="edit-task-status"
                              className="text-card-foreground"
                            >
                              Status
                            </Label>
                            <Select
                              value={editTask.status}
                              onValueChange={(
                                value:
                                  | "todo"
                                  | "in_progress"
                                  | "completed"
                                  | "cancelled"
                              ) =>
                                setEditTask({
                                  ...editTask,
                                  status: value,
                                })
                              }
                            >
                              <SelectTrigger className="bg-background border-border mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="todo">To Do</SelectItem>
                                <SelectItem value="in_progress">
                                  In Progress
                                </SelectItem>
                                <SelectItem value="completed">
                                  Completed
                                </SelectItem>
                                <SelectItem value="cancelled">
                                  Cancelled
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label
                              htmlFor="edit-task-priority"
                              className="text-card-foreground"
                            >
                              Priority
                            </Label>
                            <Select
                              value={editTask.priority}
                              onValueChange={(
                                value: "low" | "medium" | "high" | "urgent"
                              ) =>
                                setEditTask({
                                  ...editTask,
                                  priority: value,
                                })
                              }
                            >
                              <SelectTrigger className="bg-background border-border mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label
                            htmlFor="edit-task-hours"
                            className="text-card-foreground"
                          >
                            Estimated Hours (optional)
                          </Label>
                          <Input
                            id="edit-task-hours"
                            type="number"
                            value={editTask.estimatedHours}
                            onChange={(e) =>
                              setEditTask({
                                ...editTask,
                                estimatedHours: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="0.0"
                            step="0.5"
                            min="0"
                          />
                        </div>

                        <div className="flex space-x-3 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowEditTask(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button type="submit" className="flex-1">
                            Update Task
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
                <div className="flex-1">
                  <Label htmlFor="search" className="text-card-foreground">
                    Search
                  </Label>
                  <div className="relative mt-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-tahoe-text-muted" />
                    <Input
                      id="search"
                      placeholder="Search tasks..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-background border-border"
                    />
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="status-filter"
                    className="text-card-foreground"
                  >
                    Status
                  </Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-background border-border mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label
                    htmlFor="priority-filter"
                    className="text-card-foreground"
                  >
                    Priority
                  </Label>
                  <Select
                    value={priorityFilter}
                    onValueChange={setPriorityFilter}
                  >
                    <SelectTrigger className="bg-background border-border mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label
                    htmlFor="project-filter"
                    className="text-card-foreground"
                  >
                    Project
                  </Label>
                  <Select
                    value={projectFilter}
                    onValueChange={setProjectFilter}
                  >
                    <SelectTrigger className="bg-background border-border mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">All Projects</SelectItem>
                      {allProjects.map((project) => {
                        const client = clients.find(
                          (c) => c.id === project.clientId
                        );
                        return (
                          <SelectItem
                            key={project.id}
                            value={project.id}
                            className="text-card-foreground hover:bg-accent"
                          >
                            {project.name} {client ? `(${client.name})` : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Estimated Hours</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex flex-col items-center space-y-2">
                            <ClockIcon className="h-8 w-8 text-tahoe-text-muted" />
                            <p className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              No tasks found
                            </p>
                            <p className="text-tahoe-text-muted text-sm">
                              {searchTerm ||
                              statusFilter !== "all" ||
                              priorityFilter !== "all" ||
                              projectFilter !== "all"
                                ? "Try adjusting your filters"
                                : "No tasks available. Create your first task!"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTasks.map((task) => {
                        const project = allProjects.find(
                          (p) => p.id === task.projectId
                        );
                        const client = clients.find(
                          (c) => c.id === project?.clientId
                        );

                        return (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                              {task.name}
                            </TableCell>
                            <TableCell className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              {task.description || "—"}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
                                  task.status === "completed"
                                    ? "bg-macaw-green-100 text-macaw-green-800 dark:bg-macaw-green-900 dark:text-macaw-green-200"
                                    : task.status === "in_progress"
                                    ? "bg-macaw-blue-100 text-macaw-blue-800 dark:bg-macaw-blue-900 dark:text-macaw-blue-200"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                }`}
                              >
                                {task.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
                                  task.priority === "urgent"
                                    ? "bg-macaw-red-100 text-macaw-red-800 dark:bg-macaw-red-900 dark:text-macaw-red-200"
                                    : task.priority === "high"
                                    ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                                    : task.priority === "medium"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                    : "bg-macaw-green-100 text-macaw-green-800 dark:bg-macaw-green-900 dark:text-macaw-green-200"
                                }`}
                              >
                                {task.priority}
                              </span>
                            </TableCell>
                            <TableCell className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              {client?.name || "—"}
                            </TableCell>
                            <TableCell className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              {project?.name || "—"}
                            </TableCell>
                            <TableCell className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              {task.estimatedHours
                                ? `${task.estimatedHours}h`
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditTask(task)}
                                  className="h-8 w-8 p-0"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
