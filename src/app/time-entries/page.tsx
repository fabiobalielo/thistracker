"use client";

import { useState } from "react";
import { TimeEntry } from "@/lib/types";
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
  CalendarIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

export default function TimeEntriesPage() {
  const {
    clients,
    projects,
    tasks,
    timeEntries,
    isLoading,
    error,
    addTimeEntry,
    updateTimeEntry,
    removeTimeEntry,
    syncAfterUpdate,
  } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [showAddTimeEntry, setShowAddTimeEntry] = useState(false);
  const [showEditTimeEntry, setShowEditTimeEntry] = useState(false);
  const [editingTimeEntry, setEditingTimeEntry] = useState<TimeEntry | null>(
    null
  );
  const [newTimeEntry, setNewTimeEntry] = useState({
    taskId: "",
    description: "",
    startTime: "",
    endTime: "",
    hourlyRate: "",
    notes: "",
  });
  const [editTimeEntry, setEditTimeEntry] = useState({
    taskId: "",
    description: "",
    startTime: "",
    endTime: "",
    hourlyRate: "",
    notes: "",
  });

  const handleAddTimeEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newTimeEntry.taskId.trim() ||
      !newTimeEntry.description.trim() ||
      !newTimeEntry.startTime
    )
      return;

    // Store the form data before clearing it
    const timeEntryData = {
      ...newTimeEntry,
      hourlyRate: newTimeEntry.hourlyRate
        ? parseFloat(newTimeEntry.hourlyRate)
        : undefined,
    };

    // Find the selected task to get projectId and clientId
    const selectedTask = tasks.find((task) => task.id === newTimeEntry.taskId);
    if (!selectedTask) {
      console.error("Selected task not found");
      return;
    }

    const selectedProject = projects.find(
      (project) => project.id === selectedTask.projectId
    );
    if (!selectedProject) {
      console.error("Selected project not found");
      return;
    }

    // Create optimistic time entry data
    const optimisticTimeEntry: TimeEntry = {
      id: `temp-${Date.now()}`, // Temporary ID
      taskId: newTimeEntry.taskId,
      projectId: selectedTask.projectId,
      clientId: selectedProject.clientId,
      description: newTimeEntry.description,
      startTime: new Date(newTimeEntry.startTime),
      endTime: newTimeEntry.endTime
        ? new Date(newTimeEntry.endTime)
        : undefined,
      hourlyRate: newTimeEntry.hourlyRate
        ? parseFloat(newTimeEntry.hourlyRate)
        : undefined,
      notes: newTimeEntry.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    // Update UI immediately (optimistic update)
    addTimeEntry(optimisticTimeEntry);

    // Clear form and close dialog immediately
    setNewTimeEntry({
      taskId: "",
      description: "",
      startTime: "",
      endTime: "",
      hourlyRate: "",
      notes: "",
    });
    setShowAddTimeEntry(false);

    // Sync with server in background
    try {
      const response = await fetch("/api/time-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(timeEntryData),
      });

      if (response.ok) {
        const timeEntryData = await response.json();
        // Update with real data from server
        updateTimeEntry(optimisticTimeEntry.id, timeEntryData);
        // Trigger background sync to ensure consistency
        syncAfterUpdate();
      } else {
        // If server call fails, remove the optimistic update
        removeTimeEntry(optimisticTimeEntry.id);
        alert("Failed to create time entry. Please try again.");
      }
    } catch (error) {
      console.error("Error creating time entry:", error);
      // Remove the optimistic update on error
      removeTimeEntry(optimisticTimeEntry.id);
      alert("Failed to create time entry. Please try again.");
    }
  };

  const handleEditTimeEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !editingTimeEntry ||
      !editTimeEntry.taskId.trim() ||
      !editTimeEntry.description.trim() ||
      !editTimeEntry.startTime
    )
      return;

    // Store original data for rollback
    const originalTimeEntry = { ...editingTimeEntry };

    // Update UI immediately (optimistic update)
    updateTimeEntry(editingTimeEntry.id, {
      taskId: editTimeEntry.taskId,
      description: editTimeEntry.description,
      startTime: new Date(editTimeEntry.startTime),
      endTime: editTimeEntry.endTime
        ? new Date(editTimeEntry.endTime)
        : undefined,
      hourlyRate: editTimeEntry.hourlyRate
        ? parseFloat(editTimeEntry.hourlyRate)
        : undefined,
      notes: editTimeEntry.notes,
      updatedAt: new Date(),
    });

    // Close dialog immediately
    setShowEditTimeEntry(false);
    setEditingTimeEntry(null);
    setEditTimeEntry({
      taskId: "",
      description: "",
      startTime: "",
      endTime: "",
      hourlyRate: "",
      notes: "",
    });

    // Sync with server in background
    try {
      const response = await fetch(`/api/time-entries/${editingTimeEntry.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editTimeEntry,
          hourlyRate: editTimeEntry.hourlyRate
            ? parseFloat(editTimeEntry.hourlyRate)
            : undefined,
        }),
      });

      if (response.ok) {
        const timeEntryData = await response.json();
        // Update with real data from server
        updateTimeEntry(editingTimeEntry.id, timeEntryData);
        // Trigger background sync to ensure consistency
        syncAfterUpdate();
      } else {
        // If server call fails, rollback to original data
        updateTimeEntry(editingTimeEntry.id, originalTimeEntry);
        alert("Failed to update time entry. Please try again.");
      }
    } catch (error) {
      console.error("Error updating time entry:", error);
      // Rollback to original data on error
      updateTimeEntry(editingTimeEntry.id, originalTimeEntry);
      alert("Failed to update time entry. Please try again.");
    }
  };

  const handleDeleteTimeEntry = async (timeEntryId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this time entry? This action cannot be undone."
      )
    ) {
      return;
    }

    // Store time entry data for rollback
    const timeEntryToDelete = timeEntries.find((te) => te.id === timeEntryId);
    if (!timeEntryToDelete) return;

    // Update UI immediately (optimistic update)
    removeTimeEntry(timeEntryId);

    // Sync with server in background
    try {
      const response = await fetch(`/api/time-entries/${timeEntryId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Trigger background sync to ensure consistency
        syncAfterUpdate();
      } else {
        // If server call fails, restore the time entry
        addTimeEntry(timeEntryToDelete);
        alert("Failed to delete time entry. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting time entry:", error);
      // Restore the time entry on error
      addTimeEntry(timeEntryToDelete);
      alert("Failed to delete time entry. Please try again.");
    }
  };

  const openEditTimeEntry = (timeEntry: TimeEntry) => {
    setEditingTimeEntry(timeEntry);
    setEditTimeEntry({
      taskId: timeEntry.taskId,
      description: timeEntry.description,
      startTime: timeEntry.startTime
        ? new Date(timeEntry.startTime).toISOString().slice(0, 16)
        : "",
      endTime: timeEntry.endTime
        ? new Date(timeEntry.endTime).toISOString().slice(0, 16)
        : "",
      hourlyRate: timeEntry.hourlyRate?.toString() || "",
      notes: timeEntry.notes || "",
    });
    setShowEditTimeEntry(true);
  };

  // Filter time entries based on search and filters
  const filteredTimeEntries = timeEntries.filter((timeEntry) => {
    const task = tasks.find((t) => t.id === timeEntry.taskId);
    const project = projects.find((p) => p.id === timeEntry.projectId);
    const client = clients.find((c) => c.id === timeEntry.clientId);

    const matchesSearch =
      timeEntry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClient =
      clientFilter === "all" || timeEntry.clientId === clientFilter;
    const matchesProject =
      projectFilter === "all" || timeEntry.projectId === projectFilter;
    const matchesTask = taskFilter === "all" || timeEntry.taskId === taskFilter;

    return matchesSearch && matchesClient && matchesProject && matchesTask;
  });

  // Get filtered tasks based on selected project
  const filteredTasks =
    taskFilter === "all"
      ? tasks.filter(
          (task) => projectFilter === "all" || task.projectId === projectFilter
        )
      : tasks.filter((task) => task.id === taskFilter);

  // Get filtered projects based on selected client
  const filteredProjects =
    projectFilter === "all"
      ? projects.filter(
          (project) =>
            clientFilter === "all" || project.clientId === clientFilter
        )
      : projects.filter((project) => project.id === projectFilter);

  const formatDuration = (duration?: number) => {
    if (!duration) return "—";
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatDateTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString();
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="glass p-8 rounded-tahoe-xl">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-macaw-red-500 mx-auto"></div>
            <p className="mt-4 text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark text-center">
              Loading time entries...
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
              Time Entries
            </h1>
            <p className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
              Track your time and billable hours
            </p>
          </div>

          {/* Time Entries Table */}
          <Card className="glass bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <CardTitle className="text-xl text-card-foreground">
                  Time Entries
                </CardTitle>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                  <Dialog
                    open={showAddTimeEntry}
                    onOpenChange={setShowAddTimeEntry}
                  >
                    <DialogTrigger asChild>
                      <Button className="flex items-center space-x-2">
                        <PlusIcon className="h-4 w-4" />
                        <span>Add Time Entry</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle className="text-card-foreground">
                          Add New Time Entry
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddTimeEntry} className="space-y-4">
                        <div>
                          <Label
                            htmlFor="time-entry-task"
                            className="text-card-foreground"
                          >
                            Task *
                          </Label>
                          <Select
                            value={newTimeEntry.taskId}
                            onValueChange={(value) =>
                              setNewTimeEntry({
                                ...newTimeEntry,
                                taskId: value,
                              })
                            }
                          >
                            <SelectTrigger className="bg-background border-border mt-1">
                              <SelectValue placeholder="Select a task" />
                            </SelectTrigger>
                            <SelectContent>
                              {tasks.map((task) => {
                                const project = projects.find(
                                  (p) => p.id === task.projectId
                                );
                                const client = clients.find(
                                  (c) => c.id === project?.clientId
                                );
                                return (
                                  <SelectItem key={task.id} value={task.id}>
                                    {task.name} - {project?.name} (
                                    {client?.name})
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label
                            htmlFor="time-entry-description"
                            className="text-card-foreground"
                          >
                            Description *
                          </Label>
                          <Input
                            id="time-entry-description"
                            type="text"
                            value={newTimeEntry.description}
                            onChange={(e) =>
                              setNewTimeEntry({
                                ...newTimeEntry,
                                description: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="What did you work on?"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label
                              htmlFor="time-entry-start"
                              className="text-card-foreground"
                            >
                              Start Time *
                            </Label>
                            <Input
                              id="time-entry-start"
                              type="datetime-local"
                              value={newTimeEntry.startTime}
                              onChange={(e) =>
                                setNewTimeEntry({
                                  ...newTimeEntry,
                                  startTime: e.target.value,
                                })
                              }
                              className="bg-background border-border mt-1"
                              required
                            />
                          </div>

                          <div>
                            <Label
                              htmlFor="time-entry-end"
                              className="text-card-foreground"
                            >
                              End Time
                            </Label>
                            <Input
                              id="time-entry-end"
                              type="datetime-local"
                              value={newTimeEntry.endTime}
                              onChange={(e) =>
                                setNewTimeEntry({
                                  ...newTimeEntry,
                                  endTime: e.target.value,
                                })
                              }
                              className="bg-background border-border mt-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label
                            htmlFor="time-entry-rate"
                            className="text-card-foreground"
                          >
                            Hourly Rate (optional)
                          </Label>
                          <Input
                            id="time-entry-rate"
                            type="number"
                            value={newTimeEntry.hourlyRate}
                            onChange={(e) =>
                              setNewTimeEntry({
                                ...newTimeEntry,
                                hourlyRate: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="time-entry-notes"
                            className="text-card-foreground"
                          >
                            Notes
                          </Label>
                          <Textarea
                            id="time-entry-notes"
                            value={newTimeEntry.notes}
                            onChange={(e) =>
                              setNewTimeEntry({
                                ...newTimeEntry,
                                notes: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="Additional notes..."
                            rows={3}
                          />
                        </div>

                        <div className="flex space-x-3 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAddTimeEntry(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button type="submit" className="flex-1">
                            Create Time Entry
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Edit Time Entry Dialog */}
                  <Dialog
                    open={showEditTimeEntry}
                    onOpenChange={setShowEditTimeEntry}
                  >
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle className="text-card-foreground">
                          Edit Time Entry
                        </DialogTitle>
                      </DialogHeader>
                      <form
                        onSubmit={handleEditTimeEntry}
                        className="space-y-4"
                      >
                        <div>
                          <Label
                            htmlFor="edit-time-entry-task"
                            className="text-card-foreground"
                          >
                            Task *
                          </Label>
                          <Select
                            value={editTimeEntry.taskId}
                            onValueChange={(value) =>
                              setEditTimeEntry({
                                ...editTimeEntry,
                                taskId: value,
                              })
                            }
                          >
                            <SelectTrigger className="bg-background border-border mt-1">
                              <SelectValue placeholder="Select a task" />
                            </SelectTrigger>
                            <SelectContent>
                              {tasks.map((task) => {
                                const project = projects.find(
                                  (p) => p.id === task.projectId
                                );
                                const client = clients.find(
                                  (c) => c.id === project?.clientId
                                );
                                return (
                                  <SelectItem key={task.id} value={task.id}>
                                    {task.name} - {project?.name} (
                                    {client?.name})
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label
                            htmlFor="edit-time-entry-description"
                            className="text-card-foreground"
                          >
                            Description *
                          </Label>
                          <Input
                            id="edit-time-entry-description"
                            type="text"
                            value={editTimeEntry.description}
                            onChange={(e) =>
                              setEditTimeEntry({
                                ...editTimeEntry,
                                description: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="What did you work on?"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label
                              htmlFor="edit-time-entry-start"
                              className="text-card-foreground"
                            >
                              Start Time *
                            </Label>
                            <Input
                              id="edit-time-entry-start"
                              type="datetime-local"
                              value={editTimeEntry.startTime}
                              onChange={(e) =>
                                setEditTimeEntry({
                                  ...editTimeEntry,
                                  startTime: e.target.value,
                                })
                              }
                              className="bg-background border-border mt-1"
                              required
                            />
                          </div>

                          <div>
                            <Label
                              htmlFor="edit-time-entry-end"
                              className="text-card-foreground"
                            >
                              End Time
                            </Label>
                            <Input
                              id="edit-time-entry-end"
                              type="datetime-local"
                              value={editTimeEntry.endTime}
                              onChange={(e) =>
                                setEditTimeEntry({
                                  ...editTimeEntry,
                                  endTime: e.target.value,
                                })
                              }
                              className="bg-background border-border mt-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label
                            htmlFor="edit-time-entry-rate"
                            className="text-card-foreground"
                          >
                            Hourly Rate (optional)
                          </Label>
                          <Input
                            id="edit-time-entry-rate"
                            type="number"
                            value={editTimeEntry.hourlyRate}
                            onChange={(e) =>
                              setEditTimeEntry({
                                ...editTimeEntry,
                                hourlyRate: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="edit-time-entry-notes"
                            className="text-card-foreground"
                          >
                            Notes
                          </Label>
                          <Textarea
                            id="edit-time-entry-notes"
                            value={editTimeEntry.notes}
                            onChange={(e) =>
                              setEditTimeEntry({
                                ...editTimeEntry,
                                notes: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="Additional notes..."
                            rows={3}
                          />
                        </div>

                        <div className="flex space-x-3 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowEditTimeEntry(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button type="submit" className="flex-1">
                            Update Time Entry
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
                      placeholder="Search time entries..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-background border-border"
                    />
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="client-filter"
                    className="text-card-foreground"
                  >
                    Client
                  </Label>
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger className="bg-background border-border mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">All Clients</SelectItem>
                      {clients.map((client) => (
                        <SelectItem
                          key={client.id}
                          value={client.id}
                          className="text-card-foreground hover:bg-accent"
                        >
                          {client.name}
                        </SelectItem>
                      ))}
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
                      {filteredProjects.map((project) => {
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
                <div>
                  <Label htmlFor="task-filter" className="text-card-foreground">
                    Task
                  </Label>
                  <Select value={taskFilter} onValueChange={setTaskFilter}>
                    <SelectTrigger className="bg-background border-border mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">All Tasks</SelectItem>
                      {filteredTasks.map((task) => {
                        const project = projects.find(
                          (p) => p.id === task.projectId
                        );
                        const client = clients.find(
                          (c) => c.id === project?.clientId
                        );
                        return (
                          <SelectItem
                            key={task.id}
                            value={task.id}
                            className="text-card-foreground hover:bg-accent"
                          >
                            {task.name} - {project?.name} ({client?.name})
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
                      <TableHead>Description</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTimeEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8">
                          <div className="flex flex-col items-center space-y-2">
                            <ClockIcon className="h-8 w-8 text-tahoe-text-muted" />
                            <p className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              {searchTerm ||
                              clientFilter !== "all" ||
                              projectFilter !== "all" ||
                              taskFilter !== "all"
                                ? "No time entries found matching your filters"
                                : "No time entries yet"}
                            </p>
                            <p className="text-tahoe-text-muted text-sm">
                              {searchTerm ||
                              clientFilter !== "all" ||
                              projectFilter !== "all" ||
                              taskFilter !== "all"
                                ? "Try adjusting your filters"
                                : "Add your first time entry to get started"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTimeEntries.map((timeEntry) => {
                        const task = tasks.find(
                          (t) => t.id === timeEntry.taskId
                        );
                        const project = projects.find(
                          (p) => p.id === timeEntry.projectId
                        );
                        const client = clients.find(
                          (c) => c.id === timeEntry.clientId
                        );

                        return (
                          <TableRow key={timeEntry.id}>
                            <TableCell className="font-medium text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                              {timeEntry.description}
                            </TableCell>
                            <TableCell className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              {client?.name || "—"}
                            </TableCell>
                            <TableCell className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              {project?.name || "—"}
                            </TableCell>
                            <TableCell className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              {task?.name || "—"}
                            </TableCell>
                            <TableCell className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              <div className="flex items-center space-x-1">
                                <CalendarIcon className="h-3 w-3" />
                                <span>
                                  {formatDateTime(timeEntry.startTime)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              {timeEntry.endTime ? (
                                <div className="flex items-center space-x-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  <span>
                                    {formatDateTime(timeEntry.endTime)}
                                  </span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              {formatDuration(timeEntry.duration)}
                            </TableCell>
                            <TableCell className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              {timeEntry.hourlyRate ? (
                                <div className="flex items-center space-x-1">
                                  <CurrencyDollarIcon className="h-3 w-3" />
                                  <span>${timeEntry.hourlyRate}/hr</span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              {timeEntry.totalAmount ? (
                                <div className="flex items-center space-x-1">
                                  <CurrencyDollarIcon className="h-3 w-3" />
                                  <span>
                                    ${timeEntry.totalAmount.toFixed(2)}
                                  </span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditTimeEntry(timeEntry)}
                                  className="h-8 w-8 p-0"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteTimeEntry(timeEntry.id)
                                  }
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
