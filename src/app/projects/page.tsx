"use client";

import { useState } from "react";
import { Client, Project, Task } from "@/lib/types";
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
  FolderIcon,
  PlusIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

export default function ProjectsPage() {
  const {
    clients,
    projects,
    tasks,
    isLoading,
    error,
    addProject,
    updateProject,
    removeProject,
    syncAfterUpdate,
  } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [showAddProject, setShowAddProject] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    status: "active",
    hourlyRate: "",
    clientId: "",
  });
  const [editProject, setEditProject] = useState({
    name: "",
    description: "",
    status: "active",
    hourlyRate: "",
    clientId: "",
  });

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted with data:", newProject);
    console.log("Available clients:", clients);
    console.log("Validation check:", {
      nameValid: !!newProject.name.trim(),
      clientIdValid: !!newProject.clientId,
      clientExists: clients.find((c) => c.id === newProject.clientId),
    });

    if (!newProject.name.trim() || !newProject.clientId) {
      console.log("Validation failed - missing name or clientId");
      alert("Please fill in all required fields (Project Name and Client)");
      return;
    }

    // Store the form data before clearing it
    const projectData = {
      ...newProject,
      hourlyRate: newProject.hourlyRate
        ? parseFloat(newProject.hourlyRate)
        : null,
    };

    // Create optimistic project data
    const optimisticProject: Project = {
      id: `temp-${Date.now()}`, // Temporary ID
      clientId: newProject.clientId,
      name: newProject.name,
      description: newProject.description,
      status: newProject.status as Project["status"],
      hourlyRate: newProject.hourlyRate
        ? parseFloat(newProject.hourlyRate)
        : undefined,
      budget: undefined,
      startDate: undefined,
      endDate: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    // Update UI immediately (optimistic update)
    addProject(optimisticProject);

    // Clear form and close dialog immediately
    setNewProject({
      name: "",
      description: "",
      status: "active",
      hourlyRate: "",
      clientId: "",
    });
    setShowAddProject(false);

    // Sync with server in background
    try {
      console.log("Creating project with data:", projectData);
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(projectData),
      });

      if (response.ok) {
        const serverProjectData = await response.json();
        console.log("Project created successfully:", serverProjectData);
        // Update with real data from server
        updateProject(optimisticProject.id, serverProjectData);
        // Trigger background sync to ensure consistency
        syncAfterUpdate();
      } else {
        const errorText = await response.text();
        console.error("Failed to create project:", response.status, errorText);
        // If server call fails, remove the optimistic update
        removeProject(optimisticProject.id);
        alert("Failed to create project. Please try again.");
      }
    } catch (error) {
      console.error("Error creating project:", error);
      // Remove the optimistic update on error
      removeProject(optimisticProject.id);
      alert("Failed to create project. Please try again.");
    }
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editProject.name.trim() || !editProject.clientId)
      return;

    // Store original data for rollback
    const originalProject = { ...editingProject };

    // Update UI immediately (optimistic update)
    updateProject(editingProject.id, {
      name: editProject.name,
      description: editProject.description,
      status: editProject.status as Project["status"],
      hourlyRate: editProject.hourlyRate
        ? parseFloat(editProject.hourlyRate)
        : undefined,
      clientId: editProject.clientId,
      updatedAt: new Date(),
    });

    // Close dialog immediately
    setShowEditProject(false);
    setEditingProject(null);
    setEditProject({
      name: "",
      description: "",
      status: "active",
      hourlyRate: "",
      clientId: "",
    });

    // Sync with server in background
    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editProject,
          hourlyRate: editProject.hourlyRate
            ? parseFloat(editProject.hourlyRate)
            : null,
        }),
      });

      if (response.ok) {
        const projectData = await response.json();
        // Update with real data from server
        updateProject(editingProject.id, projectData);
        // Trigger background sync to ensure consistency
        syncAfterUpdate();
      } else {
        // If server call fails, rollback to original data
        updateProject(editingProject.id, originalProject);
        alert("Failed to update project. Please try again.");
      }
    } catch (error) {
      console.error("Error updating project:", error);
      // Rollback to original data on error
      updateProject(editingProject.id, originalProject);
      alert("Failed to update project. Please try again.");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this project? This action cannot be undone."
      )
    ) {
      return;
    }

    // Store project data for rollback
    const projectToDelete = projects.find((p) => p.id === projectId);
    if (!projectToDelete) return;

    // Update UI immediately (optimistic update)
    removeProject(projectId);

    // Sync with server in background
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Trigger background sync to ensure consistency
        syncAfterUpdate();
      } else {
        // If server call fails, restore the project
        addProject(projectToDelete);
        alert("Failed to delete project. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      // Restore the project on error
      addProject(projectToDelete);
      alert("Failed to delete project. Please try again.");
    }
  };

  const openEditProject = (project: Project) => {
    setEditingProject(project);
    setEditProject({
      name: project.name,
      description: project.description || "",
      status: project.status,
      hourlyRate: project.hourlyRate?.toString() || "",
      clientId: project.clientId,
    });
    setShowEditProject(true);
  };

  // Filter projects based on search and filters
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;
    const matchesClient =
      clientFilter === "all" || project.clientId === clientFilter;

    return matchesSearch && matchesStatus && matchesClient;
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="glass p-8 rounded-tahoe-xl">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-macaw-red-500 mx-auto"></div>
            <p className="mt-4 text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark text-center">
              Loading projects...
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
              Projects
            </h1>
            <p className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
              Manage your projects and track progress
            </p>
          </div>

          {/* Projects Table */}
          <Card className="glass bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <CardTitle className="text-xl text-card-foreground">
                  Projects
                </CardTitle>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                  <Dialog
                    open={showAddProject}
                    onOpenChange={setShowAddProject}
                  >
                    <DialogTrigger asChild>
                      <Button className="flex items-center space-x-2">
                        <PlusIcon className="h-4 w-4" />
                        <span>Add Project</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle className="text-card-foreground">
                          Add New Project
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddProject} className="space-y-4">
                        <div>
                          <Label
                            htmlFor="project-name"
                            className="text-card-foreground"
                          >
                            Project Name *
                          </Label>
                          <Input
                            id="project-name"
                            type="text"
                            value={newProject.name}
                            onChange={(e) =>
                              setNewProject({
                                ...newProject,
                                name: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="Enter project name"
                            required
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="project-description"
                            className="text-card-foreground"
                          >
                            Description
                          </Label>
                          <Textarea
                            id="project-description"
                            value={newProject.description}
                            onChange={(e) =>
                              setNewProject({
                                ...newProject,
                                description: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="Enter project description"
                            rows={3}
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="project-client"
                            className="text-card-foreground"
                          >
                            Client *
                          </Label>
                          <Select
                            value={newProject.clientId}
                            onValueChange={(value) =>
                              setNewProject({ ...newProject, clientId: value })
                            }
                          >
                            <SelectTrigger className="bg-background border-border mt-1">
                              <SelectValue placeholder="Select a client" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              {clients.length === 0 ? (
                                <SelectItem value="" disabled>
                                  No clients available - Create a client first
                                </SelectItem>
                              ) : (
                                clients.map((client) => (
                                  <SelectItem
                                    key={client.id}
                                    value={client.id}
                                    className="text-card-foreground hover:bg-accent"
                                  >
                                    {client.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label
                            htmlFor="project-status"
                            className="text-card-foreground"
                          >
                            Status
                          </Label>
                          <Select
                            value={newProject.status}
                            onValueChange={(value) =>
                              setNewProject({ ...newProject, status: value })
                            }
                          >
                            <SelectTrigger className="bg-background border-border mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="paused">Paused</SelectItem>
                              <SelectItem value="completed">
                                Completed
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label
                            htmlFor="project-rate"
                            className="text-card-foreground"
                          >
                            Hourly Rate (optional)
                          </Label>
                          <Input
                            id="project-rate"
                            type="number"
                            value={newProject.hourlyRate}
                            onChange={(e) =>
                              setNewProject({
                                ...newProject,
                                hourlyRate: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>

                        <div className="flex space-x-3 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAddProject(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button type="submit" className="flex-1">
                            Create Project
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Edit Project Dialog */}
                  <Dialog
                    open={showEditProject}
                    onOpenChange={setShowEditProject}
                  >
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle className="text-card-foreground">
                          Edit Project
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleEditProject} className="space-y-4">
                        <div>
                          <Label
                            htmlFor="edit-project-name"
                            className="text-card-foreground"
                          >
                            Project Name *
                          </Label>
                          <Input
                            id="edit-project-name"
                            type="text"
                            value={editProject.name}
                            onChange={(e) =>
                              setEditProject({
                                ...editProject,
                                name: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="Enter project name"
                            required
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="edit-project-client"
                            className="text-card-foreground"
                          >
                            Client *
                          </Label>
                          <Select
                            value={editProject.clientId}
                            onValueChange={(value) =>
                              setEditProject({
                                ...editProject,
                                clientId: value,
                              })
                            }
                          >
                            <SelectTrigger className="bg-background border-border mt-1">
                              <SelectValue placeholder="Select a client" />
                            </SelectTrigger>
                            <SelectContent>
                              {clients.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label
                            htmlFor="edit-project-description"
                            className="text-card-foreground"
                          >
                            Description
                          </Label>
                          <Textarea
                            id="edit-project-description"
                            value={editProject.description}
                            onChange={(e) =>
                              setEditProject({
                                ...editProject,
                                description: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="Enter project description"
                            rows={3}
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="edit-project-status"
                            className="text-card-foreground"
                          >
                            Status
                          </Label>
                          <Select
                            value={editProject.status}
                            onValueChange={(
                              value:
                                | "active"
                                | "paused"
                                | "completed"
                                | "cancelled"
                            ) =>
                              setEditProject({
                                ...editProject,
                                status: value,
                              })
                            }
                          >
                            <SelectTrigger className="bg-background border-border mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="paused">Paused</SelectItem>
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
                            htmlFor="edit-project-rate"
                            className="text-card-foreground"
                          >
                            Hourly Rate (optional)
                          </Label>
                          <Input
                            id="edit-project-rate"
                            type="number"
                            value={editProject.hourlyRate}
                            onChange={(e) =>
                              setEditProject({
                                ...editProject,
                                hourlyRate: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>

                        <div className="flex space-x-3 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowEditProject(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button type="submit" className="flex-1">
                            Update Project
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
                      placeholder="Search projects..."
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
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
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
              </div>

              {/* Table */}
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Hourly Rate</TableHead>
                      <TableHead>Tasks</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex flex-col items-center space-y-2">
                            <FolderIcon className="h-8 w-8 text-tahoe-text-muted" />
                            <p className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              {searchTerm ||
                              statusFilter !== "all" ||
                              clientFilter !== "all"
                                ? "No projects found matching your filters"
                                : "No projects yet"}
                            </p>
                            <p className="text-tahoe-text-muted text-sm">
                              {searchTerm ||
                              statusFilter !== "all" ||
                              clientFilter !== "all"
                                ? "Try adjusting your filters"
                                : "Add your first project to get started"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProjects.map((project) => {
                        const client = clients.find(
                          (c) => c.id === project.clientId
                        );
                        const projectTasks = tasks.filter(
                          (t) => t.projectId === project.id
                        );

                        return (
                          <TableRow key={project.id}>
                            <TableCell className="font-medium text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                              {project.name}
                            </TableCell>
                            <TableCell className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              {project.description || "—"}
                            </TableCell>
                            <TableCell className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              {client?.name || "—"}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
                                  project.status === "active"
                                    ? "bg-macaw-green-100 text-macaw-green-800 dark:bg-macaw-green-900 dark:text-macaw-green-200"
                                    : project.status === "paused"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                }`}
                              >
                                {project.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              {project.hourlyRate ? (
                                <div className="flex items-center space-x-1">
                                  <CurrencyDollarIcon className="h-3 w-3" />
                                  <span>${project.hourlyRate}/hr</span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-macaw-blue-100 text-macaw-blue-800 dark:bg-macaw-blue-900 dark:text-macaw-blue-200">
                                {projectTasks.length} tasks
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditProject(project)}
                                  className="h-8 w-8 p-0"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteProject(project.id)
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
