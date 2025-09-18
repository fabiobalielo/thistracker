"use client";

import { useState } from "react";
import { Client } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useData } from "@/contexts/DataContext";
import {
  UserGroupIcon,
  PlusIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

export default function ClientsPage() {
  const {
    clients,
    projects,
    isLoading,
    error,
    addClient,
    updateClient,
    removeClient,
    syncAfterUpdate,
  } = useData();

  console.log("ClientsPage: Current state:", {
    clients,
    projects,
    isLoading,
    clientsLength: clients.length,
    projectsLength: projects.length,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddClient, setShowAddClient] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });
  const [editClient, setEditClient] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name.trim()) return;

    // Store the form data before clearing it
    const clientData = { ...newClient };

    // Create optimistic client data
    const optimisticClient: Client = {
      id: `temp-${Date.now()}`, // Temporary ID
      name: newClient.name,
      email: newClient.email,
      phone: newClient.phone,
      address: newClient.address,
      notes: newClient.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    // Update UI immediately (optimistic update)
    addClient(optimisticClient);

    // Clear form and close dialog immediately
    setNewClient({
      name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    });
    setShowAddClient(false);

    // Sync with server in background
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clientData),
      });

      if (response.ok) {
        const clientData = await response.json();
        // Update with real data from server
        updateClient(optimisticClient.id, clientData);
        // Trigger background sync to ensure consistency
        syncAfterUpdate();
      } else {
        // If server call fails, remove the optimistic update
        removeClient(optimisticClient.id);
        alert("Failed to create client. Please try again.");
      }
    } catch (error) {
      console.error("Error creating client:", error);
      // Remove the optimistic update on error
      removeClient(optimisticClient.id);
      alert("Failed to create client. Please try again.");
    }
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editClient.name.trim()) return;

    // Store original data for rollback
    const originalClient = { ...editingClient };

    // Update UI immediately (optimistic update)
    updateClient(editingClient.id, {
      name: editClient.name,
      email: editClient.email,
      phone: editClient.phone,
      address: editClient.address,
      notes: editClient.notes,
      updatedAt: new Date(),
    });

    // Close dialog immediately
    setShowEditClient(false);
    setEditingClient(null);
    setEditClient({
      name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    });

    // Sync with server in background
    try {
      const response = await fetch(`/api/clients/${editingClient.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editClient),
      });

      if (response.ok) {
        const clientData = await response.json();
        // Update with real data from server
        updateClient(editingClient.id, clientData);
        // Trigger background sync to ensure consistency
        syncAfterUpdate();
      } else {
        // If server call fails, rollback to original data
        updateClient(editingClient.id, originalClient);
        alert("Failed to update client. Please try again.");
      }
    } catch (error) {
      console.error("Error updating client:", error);
      // Rollback to original data on error
      updateClient(editingClient.id, originalClient);
      alert("Failed to update client. Please try again.");
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this client? This action cannot be undone."
      )
    ) {
      return;
    }

    // Store client data for rollback
    const clientToDelete = clients.find((c) => c.id === clientId);
    if (!clientToDelete) return;

    // Update UI immediately (optimistic update)
    removeClient(clientId);

    // Sync with server in background
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Trigger background sync to ensure consistency
        syncAfterUpdate();
      } else {
        // If server call fails, restore the client
        addClient(clientToDelete);
        alert("Failed to delete client. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      // Restore the client on error
      addClient(clientToDelete);
      alert("Failed to delete client. Please try again.");
    }
  };

  const openEditClient = (client: Client) => {
    setEditingClient(client);
    setEditClient({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      notes: client.notes || "",
    });
    setShowEditClient(true);
  };

  // Filter clients based on search
  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="glass p-8 rounded-tahoe-xl">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-macaw-red-500 mx-auto"></div>
            <p className="mt-4 text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark text-center">
              Loading clients...
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
              Clients
            </h1>
            <p className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
              Manage your client relationships
            </p>
          </div>

          {/* Clients Table */}
          <Card className="glass bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <CardTitle className="text-xl text-card-foreground">
                  Clients
                </CardTitle>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                  <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center space-x-2">
                        <PlusIcon className="h-4 w-4" />
                        <span>Add Client</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle className="text-card-foreground">
                          Add New Client
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddClient} className="space-y-4">
                        <div>
                          <Label
                            htmlFor="client-name"
                            className="text-card-foreground"
                          >
                            Client Name *
                          </Label>
                          <Input
                            id="client-name"
                            type="text"
                            value={newClient.name}
                            onChange={(e) =>
                              setNewClient({
                                ...newClient,
                                name: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="Enter client name"
                            required
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="client-email"
                            className="text-card-foreground"
                          >
                            Email
                          </Label>
                          <Input
                            id="client-email"
                            type="email"
                            value={newClient.email}
                            onChange={(e) =>
                              setNewClient({
                                ...newClient,
                                email: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="Enter email address"
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="client-phone"
                            className="text-card-foreground"
                          >
                            Phone
                          </Label>
                          <Input
                            id="client-phone"
                            type="tel"
                            value={newClient.phone}
                            onChange={(e) =>
                              setNewClient({
                                ...newClient,
                                phone: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="Enter phone number"
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="client-address"
                            className="text-card-foreground"
                          >
                            Address
                          </Label>
                          <Textarea
                            id="client-address"
                            value={newClient.address}
                            onChange={(e) =>
                              setNewClient({
                                ...newClient,
                                address: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="Enter address"
                            rows={2}
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="client-notes"
                            className="text-card-foreground"
                          >
                            Notes
                          </Label>
                          <Textarea
                            id="client-notes"
                            value={newClient.notes}
                            onChange={(e) =>
                              setNewClient({
                                ...newClient,
                                notes: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="Enter notes about the client"
                            rows={3}
                          />
                        </div>

                        <div className="flex space-x-3 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAddClient(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button type="submit" className="flex-1">
                            Create Client
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Edit Client Dialog */}
                  <Dialog
                    open={showEditClient}
                    onOpenChange={setShowEditClient}
                  >
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle className="text-card-foreground">
                          Edit Client
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleEditClient} className="space-y-4">
                        <div>
                          <Label
                            htmlFor="edit-client-name"
                            className="text-card-foreground"
                          >
                            Client Name *
                          </Label>
                          <Input
                            id="edit-client-name"
                            type="text"
                            value={editClient.name}
                            onChange={(e) =>
                              setEditClient({
                                ...editClient,
                                name: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="Enter client name"
                            required
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="edit-client-email"
                            className="text-card-foreground"
                          >
                            Email
                          </Label>
                          <Input
                            id="edit-client-email"
                            type="email"
                            value={editClient.email}
                            onChange={(e) =>
                              setEditClient({
                                ...editClient,
                                email: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="Enter email address"
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="edit-client-phone"
                            className="text-card-foreground"
                          >
                            Phone
                          </Label>
                          <Input
                            id="edit-client-phone"
                            type="tel"
                            value={editClient.phone}
                            onChange={(e) =>
                              setEditClient({
                                ...editClient,
                                phone: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="Enter phone number"
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="edit-client-address"
                            className="text-card-foreground"
                          >
                            Address
                          </Label>
                          <Textarea
                            id="edit-client-address"
                            value={editClient.address}
                            onChange={(e) =>
                              setEditClient({
                                ...editClient,
                                address: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="Enter address"
                            rows={2}
                          />
                        </div>

                        <div>
                          <Label
                            htmlFor="edit-client-notes"
                            className="text-card-foreground"
                          >
                            Notes
                          </Label>
                          <Textarea
                            id="edit-client-notes"
                            value={editClient.notes}
                            onChange={(e) =>
                              setEditClient({
                                ...editClient,
                                notes: e.target.value,
                              })
                            }
                            className="bg-background border-border mt-1"
                            placeholder="Enter notes about the client"
                            rows={3}
                          />
                        </div>

                        <div className="flex space-x-3 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowEditClient(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button type="submit" className="flex-1">
                            Update Client
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="mb-6">
                <Label htmlFor="search" className="text-card-foreground">
                  Search Clients
                </Label>
                <div className="relative mt-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-tahoe-text-muted" />
                  <Input
                    id="search"
                    placeholder="Search by name, email, or company..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background border-border"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Projects</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex flex-col items-center space-y-2">
                            <UserGroupIcon className="h-8 w-8 text-tahoe-text-muted" />
                            <p className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              {searchTerm
                                ? "No clients found matching your search"
                                : "No clients yet"}
                            </p>
                            <p className="text-tahoe-text-muted text-sm">
                              {searchTerm
                                ? "Try adjusting your search terms"
                                : "Add your first client to get started"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredClients.map((client) => {
                        const clientProjects = projects.filter(
                          (p) => p.clientId === client.id
                        );

                        return (
                          <TableRow key={client.id}>
                            <TableCell className="font-medium text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                              {client.name}
                            </TableCell>
                            <TableCell className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              {client.email ? (
                                <div className="flex items-center space-x-1">
                                  <EnvelopeIcon className="h-3 w-3" />
                                  <span>{client.email}</span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              {client.phone ? (
                                <div className="flex items-center space-x-1">
                                  <PhoneIcon className="h-3 w-3" />
                                  <span>{client.phone}</span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-macaw-blue-100 text-macaw-blue-800 dark:bg-macaw-blue-900 dark:text-macaw-blue-200">
                                {clientProjects.length} projects
                              </span>
                            </TableCell>
                            <TableCell className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              {client.address ? (
                                <div className="flex items-center space-x-1">
                                  <BuildingOfficeIcon className="h-3 w-3" />
                                  <span className="truncate max-w-32">
                                    {client.address}
                                  </span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                              {client.notes ? (
                                <span
                                  className="truncate max-w-32"
                                  title={client.notes}
                                >
                                  {client.notes}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditClient(client)}
                                  className="h-8 w-8 p-0"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteClient(client.id)}
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
