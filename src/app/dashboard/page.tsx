"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/components/AppLayout";
import LiveTracker from "@/components/LiveTracker";
import {
  ClockIcon,
  UserGroupIcon,
  FolderIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

export default function Dashboard() {
  const router = useRouter();
  const { clients, projects, tasks, timeEntries, isLoading, error } = useData();

  // Handle authentication errors
  useEffect(() => {
    if (error && error.includes("Authentication required")) {
      router.push("/login");
    }
  }, [error, router]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="glass p-8 rounded-tahoe-xl">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-macaw-red-500 mx-auto"></div>
            <p className="mt-4 text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark text-center">
              Loading dashboard...
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
          <div className="glass p-8 rounded-tahoe-xl text-center max-w-md">
            <div className="w-16 h-16 mx-auto rounded-tahoe-lg bg-gradient-to-br from-macaw-red-500 to-macaw-green-500 flex items-center justify-center mb-4">
              <ClockIcon className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark mb-2">
              Unable to Load Data
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

  // Calculate stats
  const totalClients = clients.length;
  const totalProjects = projects.length;
  const totalTasks = tasks.length;
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const totalTimeToday = timeEntries
    .filter((entry) => {
      const today = new Date();
      const entryDate = new Date(entry.startTime);
      return entryDate.toDateString() === today.toDateString();
    })
    .reduce((total, entry) => total + (entry.duration || 0), 0);

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark mb-2">
              Dashboard
            </h1>
            <p className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
              Welcome back! Here&apos;s your productivity overview.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="glass bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-card-foreground">
                  Total Clients
                </CardTitle>
                <UserGroupIcon className="h-4 w-4 text-macaw-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                  {totalClients}
                </div>
                <p className="text-xs text-tahoe-text-muted">
                  Active client relationships
                </p>
              </CardContent>
            </Card>

            <Card className="glass bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-card-foreground">
                  Active Projects
                </CardTitle>
                <FolderIcon className="h-4 w-4 text-macaw-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                  {activeProjects}
                </div>
                <p className="text-xs text-tahoe-text-muted">
                  of {totalProjects} total projects
                </p>
              </CardContent>
            </Card>

            <Card className="glass bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-card-foreground">
                  Tasks Completed
                </CardTitle>
                <ChartBarIcon className="h-4 w-4 text-macaw-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                  {completedTasks}
                </div>
                <p className="text-xs text-tahoe-text-muted">
                  of {totalTasks} total tasks
                </p>
              </CardContent>
            </Card>

            <Card className="glass bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-card-foreground">
                  Time Today
                </CardTitle>
                <ClockIcon className="h-4 w-4 text-macaw-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                  {formatDuration(totalTimeToday)}
                </div>
                <p className="text-xs text-tahoe-text-muted">Tracked today</p>
              </CardContent>
            </Card>
          </div>

          {/* Live Timer */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <LiveTracker />
            </div>
            <Card className="glass bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-lg text-card-foreground">
                  Today&apos;s Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-card-foreground">
                      Time Tracked
                    </span>
                    <span className="text-sm font-mono text-primary">
                      {formatDuration(totalTimeToday)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-card-foreground">
                      Tasks Completed
                    </span>
                    <span className="text-sm font-mono text-primary">
                      {
                        tasks.filter((t) => {
                          const today = new Date();
                          const updatedDate = new Date(t.updatedAt);
                          return (
                            t.status === "completed" &&
                            updatedDate.toDateString() === today.toDateString()
                          );
                        }).length
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-card-foreground">
                      Active Tasks
                    </span>
                    <span className="text-sm font-mono text-primary">
                      {tasks.filter((t) => t.status === "in_progress").length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-lg text-card-foreground">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={() => router.push("/time-entries")}
                    className="p-4 bg-tahoe-surface-secondary rounded-tahoe hover:bg-opacity-80 transition-all duration-200 text-left"
                  >
                    <ClockIcon className="h-6 w-6 text-macaw-red-500 mb-2" />
                    <h3 className="font-medium text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                      View Time Entries
                    </h3>
                    <p className="text-sm text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                      Manage time records
                    </p>
                  </button>

                  <button
                    onClick={() => router.push("/tasks")}
                    className="p-4 bg-tahoe-surface-secondary rounded-tahoe hover:bg-opacity-80 transition-all duration-200 text-left"
                  >
                    <ClockIcon className="h-6 w-6 text-macaw-red-500 mb-2" />
                    <h3 className="font-medium text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                      Manage Tasks
                    </h3>
                    <p className="text-sm text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                      Add or edit tasks
                    </p>
                  </button>

                  <button
                    onClick={() => router.push("/projects")}
                    className="p-4 bg-tahoe-surface-secondary rounded-tahoe hover:bg-opacity-80 transition-all duration-200 text-left"
                  >
                    <FolderIcon className="h-6 w-6 text-macaw-green-500 mb-2" />
                    <h3 className="font-medium text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                      Manage Projects
                    </h3>
                    <p className="text-sm text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                      Add or edit projects
                    </p>
                  </button>

                  <button
                    onClick={() => router.push("/clients")}
                    className="p-4 bg-tahoe-surface-secondary rounded-tahoe hover:bg-opacity-80 transition-all duration-200 text-left"
                  >
                    <UserGroupIcon className="h-6 w-6 text-macaw-blue-500 mb-2" />
                    <h3 className="font-medium text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                      Manage Clients
                    </h3>
                    <p className="text-sm text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                      Add or edit clients
                    </p>
                  </button>

                  <button
                    onClick={() => router.push("/settings")}
                    className="p-4 bg-tahoe-surface-secondary rounded-tahoe hover:bg-opacity-80 transition-all duration-200 text-left"
                  >
                    <ChartBarIcon className="h-6 w-6 text-macaw-green-500 mb-2" />
                    <h3 className="font-medium text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                      Settings
                    </h3>
                    <p className="text-sm text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                      Configure app settings
                    </p>
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card className="glass bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-lg text-card-foreground">
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timeEntries.length === 0 ? (
                  <div className="text-center py-8">
                    <ClockIcon className="h-12 w-12 text-tahoe-text-muted mx-auto mb-4" />
                    <p className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                      No recent activity
                    </p>
                    <p className="text-tahoe-text-muted text-sm mt-1">
                      Start tracking time to see activity here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {timeEntries.slice(0, 5).map((entry) => {
                      const task = tasks.find((t) => t.id === entry.taskId);
                      const project = projects.find(
                        (p) => p.id === entry.projectId
                      );
                      const client = clients.find(
                        (c) => c.id === entry.clientId
                      );

                      return (
                        <div
                          key={entry.id}
                          className="p-3 bg-tahoe-surface-secondary rounded-tahoe"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                                {entry.description}
                              </p>
                              <p className="text-xs text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                                {client?.name} → {project?.name} → {task?.name}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-mono text-macaw-green-500 dark:text-macaw-green-400">
                                {entry.duration
                                  ? formatDuration(entry.duration)
                                  : "Running..."}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
