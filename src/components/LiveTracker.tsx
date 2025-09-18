"use client";

import React, { useState, useEffect, useRef } from "react";
import { TimeEntry, Task } from "@/lib/types";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlayIcon,
  StopIcon,
  ClockIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

interface LiveTrackerProps {
  className?: string;
}

const LiveTracker: React.FC<LiveTrackerProps> = ({ className = "" }) => {
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

  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntry | null>(
    null
  );
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Form state
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");

  // Check for existing running time entries on mount
  useEffect(() => {
    const runningEntry = timeEntries.find(
      (entry) => entry.startTime && !entry.endTime
    );

    if (runningEntry && !activeTimeEntry) {
      console.log("Found running time entry:", runningEntry);

      // Find the task for this entry
      const task = tasks.find((t) => t.id === runningEntry.taskId);
      if (task) {
        setActiveTimeEntry(runningEntry);
        setIsRunning(true);
        setSelectedTaskId(runningEntry.taskId);
        setDescription(runningEntry.description);
        setNotes(runningEntry.notes || "");
        setHourlyRate(runningEntry.hourlyRate?.toString() || "");

        // Calculate elapsed time
        const now = new Date();
        const start = new Date(runningEntry.startTime);
        setElapsedTime(now.getTime() - start.getTime());
      }
    }
  }, [timeEntries, tasks, activeTimeEntry]);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Update elapsed time when timer is running
  useEffect(() => {
    if (isRunning && activeTimeEntry) {
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const start = new Date(activeTimeEntry.startTime);
        setElapsedTime(now.getTime() - start.getTime());
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, activeTimeEntry]);

  const handleStartTimer = async () => {
    if (!selectedTaskId || !description.trim()) {
      alert("Please select a task and enter a description");
      return;
    }

    const selectedTask = tasks.find((task) => task.id === selectedTaskId);
    if (!selectedTask) {
      alert("Selected task not found");
      return;
    }

    const selectedProject = projects.find(
      (p) => p.id === selectedTask.projectId
    );
    const selectedClient = clients.find(
      (c) => c.id === selectedProject?.clientId
    );

    const startTime = new Date();

    // Ensure we have valid projectId and clientId
    if (!selectedProject) {
      alert("Project not found for selected task");
      return;
    }

    if (!selectedClient) {
      alert("Client not found for selected project");
      return;
    }

    // Create optimistic time entry data
    const optimisticTimeEntry: TimeEntry = {
      id: `temp-${Date.now()}`, // Temporary ID
      taskId: selectedTaskId,
      projectId: selectedProject.id,
      clientId: selectedClient.id,
      description: description.trim(),
      startTime: startTime,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      notes: notes.trim() || undefined,
      createdAt: startTime,
      updatedAt: startTime,
      isActive: true,
    };

    // Update UI immediately (optimistic update)
    setActiveTimeEntry(optimisticTimeEntry);
    setIsRunning(true);
    setElapsedTime(0);

    // Add to data context immediately
    addTimeEntry(optimisticTimeEntry);

    // Store form data for server call
    const timeEntryData = {
      taskId: selectedTaskId,
      description: description.trim(),
      startTime: startTime.toISOString(),
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      notes: notes.trim() || undefined,
    };

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
        const serverTimeEntry = await response.json();
        console.log("Server created time entry:", serverTimeEntry);

        // Update with real data from server
        updateTimeEntry(optimisticTimeEntry.id, serverTimeEntry);

        // Update active time entry with server data
        setActiveTimeEntry(serverTimeEntry);

        // Trigger background sync to ensure consistency
        syncAfterUpdate();
      } else {
        const errorData = await response.text();
        console.error("Failed to create time entry on server:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });

        // If server call fails, remove the optimistic update
        removeTimeEntry(optimisticTimeEntry.id);
        setActiveTimeEntry(null);
        setIsRunning(false);
        setElapsedTime(0);

        alert("Failed to start timer. Please try again.");
      }
    } catch (error) {
      console.error("Error creating time entry:", error);

      // Remove the optimistic update on error
      removeTimeEntry(optimisticTimeEntry.id);
      setActiveTimeEntry(null);
      setIsRunning(false);
      setElapsedTime(0);

      alert(
        "Failed to start timer. Please check your connection and try again."
      );
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimeEntry || !isRunning) return;

    const endTime = new Date();
    const startTime = new Date(activeTimeEntry.startTime);
    const duration = endTime.getTime() - startTime.getTime();

    // Calculate total amount if hourly rate is set
    const totalAmount = activeTimeEntry.hourlyRate
      ? (duration / (1000 * 60 * 60)) * activeTimeEntry.hourlyRate
      : undefined;

    // Store original data for rollback
    const originalTimeEntry = { ...activeTimeEntry };

    // Update UI immediately (optimistic update)
    setIsRunning(false);
    setElapsedTime(duration);

    // Update data context immediately with optimistic data
    updateTimeEntry(activeTimeEntry.id, {
      endTime: endTime,
      duration,
      totalAmount,
      updatedAt: endTime,
    });

    // Store request data for server call
    const requestData = {
      taskId: activeTimeEntry.taskId,
      description: activeTimeEntry.description,
      startTime: new Date(activeTimeEntry.startTime).toISOString(),
      endTime: endTime.toISOString(),
      hourlyRate: activeTimeEntry.hourlyRate,
      notes: activeTimeEntry.notes,
    };

    // Sync with server in background
    try {
      const response = await fetch(`/api/time-entries/${activeTimeEntry.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const serverTimeEntry = await response.json();
        console.log(
          "Successfully updated time entry on server:",
          serverTimeEntry
        );

        // Update with real data from server
        updateTimeEntry(activeTimeEntry.id, serverTimeEntry);

        // Trigger background sync to ensure consistency
        syncAfterUpdate();
      } else {
        let errorData;
        const contentType = response.headers.get("content-type");

        try {
          if (contentType && contentType.includes("application/json")) {
            errorData = await response.json();
          } else {
            errorData = await response.text();
          }
        } catch (parseError) {
          errorData = "Failed to parse error response";
        }

        console.error("Failed to update time entry on server:", {
          status: response.status,
          statusText: response.statusText,
          contentType,
          error: errorData,
          timeEntryId: activeTimeEntry.id,
          requestData,
        });

        // If server call fails, rollback to original data
        updateTimeEntry(activeTimeEntry.id, originalTimeEntry);
        alert("Failed to stop timer. Please try again.");
      }
    } catch (error) {
      console.error("Error updating time entry:", error);

      // Rollback to original data on error
      updateTimeEntry(activeTimeEntry.id, originalTimeEntry);
      alert(
        "Failed to stop timer. Please check your connection and try again."
      );
    }

    // Clear the active entry after a short delay to show completion
    setTimeout(() => {
      setActiveTimeEntry(null);
      setSelectedTaskId("");
      setDescription("");
      setNotes("");
      setHourlyRate("");
      setElapsedTime(0);
    }, 2000);
  };

  const formatElapsedTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const getTaskDisplayName = (task: Task) => {
    const project = projects.find((p) => p.id === task.projectId);
    const client = clients.find((c) => c.id === project?.clientId);
    return `${task.name} - ${project?.name} (${client?.name})`;
  };

  // Filter active tasks - more lenient for now
  const activeTasks = tasks.filter(
    (task) => task.status !== "completed" && task.status !== "cancelled"
  );

  // Add debugging
  console.log("LiveTracker Debug:", {
    isLoading,
    error,
    totalTasks: tasks.length,
    activeTasks: activeTasks.length,
    totalProjects: projects.length,
    totalClients: clients.length,
    totalTimeEntries: timeEntries.length,
    runningEntries: timeEntries.filter(
      (entry) => entry.startTime && !entry.endTime
    ),
    allTasks: tasks.map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      isActive: t.isActive,
    })),
  });

  // Show loading state
  if (isLoading) {
    return (
      <Card
        className={`glass bg-card/50 backdrop-blur-sm border-border/50 ${className}`}
      >
        <CardHeader>
          <CardTitle className="text-xl text-card-foreground flex items-center space-x-2">
            <ClockIcon className="h-6 w-6" />
            <span>Live Time Tracker</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading tasks...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card
        className={`glass bg-card/50 backdrop-blur-sm border-border/50 ${className}`}
      >
        <CardHeader>
          <CardTitle className="text-xl text-card-foreground flex items-center space-x-2">
            <ClockIcon className="h-6 w-6" />
            <span>Live Time Tracker</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-8">
            <div className="text-red-500 text-2xl mb-4">⚠️</div>
            <p className="text-muted-foreground">Error loading data: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show no tasks state
  if (activeTasks.length === 0) {
    return (
      <Card
        className={`glass bg-card/50 backdrop-blur-sm border-border/50 ${className}`}
      >
        <CardHeader>
          <CardTitle className="text-xl text-card-foreground flex items-center space-x-2">
            <ClockIcon className="h-6 w-6" />
            <span>Live Time Tracker</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-8">
            <ClockIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-card-foreground mb-2">
              No Active Tasks
            </h3>
            <p className="text-muted-foreground mb-4">
              You need to create some active tasks before you can track time.
            </p>
            <p className="text-sm text-muted-foreground">
              Go to the Tasks page to create tasks, or make sure existing tasks
              are not completed or cancelled.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`glass bg-card/50 backdrop-blur-sm border-border/50 ${className}`}
    >
      <CardHeader>
        <CardTitle className="text-xl text-card-foreground flex items-center space-x-2">
          <ClockIcon className="h-6 w-6" />
          <span>Live Time Tracker</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timer Display */}
        <div className="text-center">
          <div className="text-4xl font-mono font-bold text-primary mb-2">
            {formatElapsedTime(elapsedTime)}
          </div>
          {activeTimeEntry && (
            <div className="text-sm text-muted-foreground">
              {isRunning ? "Recording time for:" : "Completed:"}{" "}
              {activeTimeEntry.description}
            </div>
          )}
        </div>

        {/* Form - only show when not running */}
        {!isRunning && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="task-select" className="text-card-foreground">
                Task *
              </Label>
              <Select
                value={selectedTaskId}
                onValueChange={setSelectedTaskId}
                disabled={isRunning}
              >
                <SelectTrigger className="bg-background border-border mt-1">
                  <SelectValue placeholder="Select a task to track time for" />
                </SelectTrigger>
                <SelectContent>
                  {activeTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {getTaskDisplayName(task)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description" className="text-card-foreground">
                What are you working on? *
              </Label>
              <Input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-background border-border mt-1"
                placeholder="Brief description of your work..."
                disabled={isRunning}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hourly-rate" className="text-card-foreground">
                  Hourly Rate (optional)
                </Label>
                <Input
                  id="hourly-rate"
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="bg-background border-border mt-1"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  disabled={isRunning}
                />
              </div>
              <div>
                <Label htmlFor="notes" className="text-card-foreground">
                  Notes (optional)
                </Label>
                <Input
                  id="notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-background border-border mt-1"
                  placeholder="Additional notes..."
                  disabled={isRunning}
                />
              </div>
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex justify-center">
          {!isRunning ? (
            <Button
              onClick={handleStartTimer}
              disabled={!selectedTaskId || !description.trim()}
              className="flex items-center space-x-2 px-8 py-3 text-lg"
              size="lg"
            >
              <PlayIcon className="h-6 w-6" />
              <span>Start Timer</span>
            </Button>
          ) : (
            <Button
              onClick={handleStopTimer}
              variant="destructive"
              className="flex items-center space-x-2 px-8 py-3 text-lg"
              size="lg"
            >
              <StopIcon className="h-6 w-6" />
              <span>Stop Timer</span>
            </Button>
          )}
        </div>

        {/* Status indicator */}
        {activeTimeEntry && !isRunning && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-green-600 dark:text-green-400">
              <CheckIcon className="h-5 w-5" />
              <span className="text-sm">Time entry saved successfully!</span>
            </div>
          </div>
        )}

        {/* Active task info when running */}
        {isRunning && activeTimeEntry && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="text-sm">
              <span className="font-medium">Task:</span>{" "}
              {tasks.find((t) => t.id === activeTimeEntry.taskId)?.name}
            </div>
            <div className="text-sm">
              <span className="font-medium">Project:</span>{" "}
              {projects.find((p) => p.id === activeTimeEntry.projectId)?.name}
            </div>
            <div className="text-sm">
              <span className="font-medium">Client:</span>{" "}
              {clients.find((c) => c.id === activeTimeEntry.clientId)?.name}
            </div>
            {activeTimeEntry.hourlyRate && (
              <div className="text-sm">
                <span className="font-medium">Rate:</span> $
                {activeTimeEntry.hourlyRate}/hr
              </div>
            )}
            <div className="text-sm">
              <span className="font-medium">Started:</span>{" "}
              {new Date(activeTimeEntry.startTime).toLocaleTimeString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveTracker;
