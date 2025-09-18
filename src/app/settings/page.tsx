"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowLeftIcon, SunIcon, MoonIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";

export default function Settings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, setTheme, actualTheme } = useTheme();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-tahoe-surface-light to-tahoe-surface-secondary dark:from-tahoe-surface-dark dark:to-tahoe-surface-secondary">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-macaw-red-500"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const themeOptions = [
    {
      value: 'light' as const,
      label: 'Light',
      icon: SunIcon,
      description: 'Always use light mode'
    },
    {
      value: 'dark' as const,
      label: 'Dark',
      icon: MoonIcon,
      description: 'Always use dark mode'
    },
    {
      value: 'system' as const,
      label: 'System',
      icon: ComputerDesktopIcon,
      description: 'Follow system preference'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-tahoe-surface-light to-tahoe-surface-secondary dark:from-tahoe-surface-dark dark:to-tahoe-surface-secondary">
      {/* Header */}
      <header className="glass border-b border-tahoe-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-tahoe hover:bg-tahoe-surface-secondary transition-colors focus-ring"
              >
                <ArrowLeftIcon className="h-5 w-5 text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark" />
              </button>
              <h1 className="text-xl font-semibold text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                Settings
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Image
                  className="h-8 w-8 rounded-full ring-2 ring-macaw-red-500"
                  src={session.user?.image || ""}
                  alt={session.user?.name || ""}
                  width={32}
                  height={32}
                />
                <span className="text-sm font-medium text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                  {session.user?.name}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="tahoe-button-primary"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Appearance Section */}
          <div className="tahoe-card">
            <h2 className="text-lg font-semibold text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark mb-6">
              Appearance
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark mb-3">
                  Theme
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {themeOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = theme === option.value;
                    
                    return (
                      <button
                        key={option.value}
                        onClick={() => setTheme(option.value)}
                        className={`p-4 rounded-tahoe-lg border-2 transition-all duration-200 focus-ring ${
                          isSelected
                            ? 'border-macaw-red-500 bg-macaw-red-50 dark:bg-macaw-red-950'
                            : 'border-tahoe-border hover:border-macaw-red-300 dark:hover:border-macaw-red-700'
                        }`}
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <Icon className={`h-6 w-6 ${
                            isSelected 
                              ? 'text-macaw-red-500' 
                              : 'text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark'
                          }`} />
                          <span className={`text-sm font-medium ${
                            isSelected 
                              ? 'text-macaw-red-700 dark:text-macaw-red-300' 
                              : 'text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark'
                          }`}>
                            {option.label}
                          </span>
                          <span className={`text-xs text-center ${
                            isSelected 
                              ? 'text-macaw-red-600 dark:text-macaw-red-400' 
                              : 'text-tahoe-text-muted'
                          }`}>
                            {option.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="pt-4 border-t border-tahoe-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                      Current Theme
                    </p>
                    <p className="text-xs text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                      {actualTheme === 'light' ? 'Light mode' : 'Dark mode'} is currently active
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    actualTheme === 'light'
                      ? 'bg-macaw-green-100 text-macaw-green-800 dark:bg-macaw-green-900 dark:text-macaw-green-200'
                      : 'bg-macaw-blue-100 text-macaw-blue-800 dark:bg-macaw-blue-900 dark:text-macaw-blue-200'
                  }`}>
                    {actualTheme === 'light' ? 'Light' : 'Dark'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Section */}
          <div className="tahoe-card">
            <h2 className="text-lg font-semibold text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark mb-6">
              Account
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Image
                  className="h-12 w-12 rounded-full ring-2 ring-macaw-red-500"
                  src={session.user?.image || ""}
                  alt={session.user?.name || ""}
                  width={48}
                  height={48}
                />
                <div>
                  <p className="font-medium text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                    {session.user?.name}
                  </p>
                  <p className="text-sm text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                    {session.user?.email}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="tahoe-card">
            <h2 className="text-lg font-semibold text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark mb-6">
              About ThisTracker
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-tahoe-lg bg-gradient-to-br from-macaw-red-500 to-macaw-green-500 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">T</span>
                </div>
                <div>
                  <p className="font-medium text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                    ThisTracker
                  </p>
                  <p className="text-sm text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                    Time tracking made beautiful
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-tahoe-border">
                <p className="text-sm text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                  Built with Next.js, Tailwind CSS, and inspired by macOS Tahoe design principles. 
                  Featuring the vibrant Arara Vermelha color palette.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
