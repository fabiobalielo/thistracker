"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { useData } from "@/contexts/DataContext";
import {
  Cog6ToothIcon,
  ClockIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { actualTheme } = useTheme();
  const { syncData, isSyncing } = useData();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-tahoe-surface-light to-tahoe-surface-secondary dark:from-tahoe-surface-dark dark:to-tahoe-surface-secondary">
        <div className="glass p-8 rounded-tahoe-xl">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-macaw-red-500 mx-auto"></div>
          <p className="mt-4 text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark text-center">
            Loading ThisTracker...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass border-b border-tahoe-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-tahoe bg-gradient-to-br from-macaw-red-500 to-macaw-green-500 flex items-center justify-center">
                  <ClockIcon className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                  ThisTracker
                </h1>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              {/* Navigation */}
              <nav className="hidden md:flex items-center space-x-1">
                <Link
                  href="/dashboard"
                  className="px-3 py-2 rounded-tahoe text-sm font-medium text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark hover:bg-tahoe-surface-secondary transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/tasks"
                  className="px-3 py-2 rounded-tahoe text-sm font-medium text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark hover:bg-tahoe-surface-secondary hover:text-tahoe-text-primary-light dark:hover:text-tahoe-text-primary-dark transition-colors"
                >
                  Tasks
                </Link>
                <Link
                  href="/clients"
                  className="px-3 py-2 rounded-tahoe text-sm font-medium text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark hover:bg-tahoe-surface-secondary hover:text-tahoe-text-primary-light dark:hover:text-tahoe-text-primary-dark transition-colors"
                >
                  Clients
                </Link>
                <Link
                  href="/projects"
                  className="px-3 py-2 rounded-tahoe text-sm font-medium text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark hover:bg-tahoe-surface-secondary hover:text-tahoe-text-primary-light dark:hover:text-tahoe-text-primary-dark transition-colors"
                >
                  Projects
                </Link>
                <Link
                  href="/settings"
                  className="px-3 py-2 rounded-tahoe text-sm font-medium text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark hover:bg-tahoe-surface-secondary hover:text-tahoe-text-primary-light dark:hover:text-tahoe-text-primary-dark transition-colors"
                >
                  Settings
                </Link>
              </nav>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                {/* Sync Button */}
                <button
                  onClick={syncData}
                  disabled={isSyncing}
                  className="flex items-center space-x-2 px-3 py-2 rounded-tahoe text-sm font-medium text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark hover:bg-tahoe-surface-secondary hover:text-tahoe-text-primary-light dark:hover:text-tahoe-text-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Sync data with Google Sheets"
                >
                  <ArrowPathIcon
                    className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
                  />
                  <span className="hidden sm:inline">
                    {isSyncing ? "Syncing..." : "Sync"}
                  </span>
                </button>

                <div className="flex items-center space-x-3 px-3 py-2 rounded-tahoe hover:bg-tahoe-surface-secondary transition-colors">
                  <Image
                    className="h-8 w-8 rounded-full ring-2 ring-macaw-red-500"
                    src={session.user?.image || ""}
                    alt={session.user?.name || ""}
                    width={32}
                    height={32}
                  />
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                      {session.user?.name}
                    </p>
                    <p className="text-xs text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                      {actualTheme === "light" ? "Light" : "Dark"} mode
                    </p>
                  </div>
                </div>

                <Link
                  href="/settings"
                  className="p-2 rounded-tahoe text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark hover:bg-tahoe-surface-secondary hover:text-tahoe-text-primary-light dark:hover:text-tahoe-text-primary-dark transition-colors focus-ring"
                >
                  <Cog6ToothIcon className="h-5 w-5" />
                </Link>

                <button
                  onClick={() => signOut()}
                  className="tahoe-button-primary text-sm"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-screen bg-gradient-to-br from-tahoe-surface-light to-tahoe-surface-secondary dark:from-tahoe-surface-dark dark:to-tahoe-surface-secondary">
        {children}
      </main>
    </div>
  );
}
