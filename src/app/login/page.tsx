"use client";

import { signIn, getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClockIcon } from "@heroicons/react/24/outline";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    getSession().then((session) => {
      if (session) {
        router.push("/");
      }
    });
  }, [router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signIn("google", {
        callbackUrl: "/",
        redirect: false,
      });

      if (result?.ok) {
        router.push("/");
      }
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-tahoe-surface-light to-tahoe-surface-secondary dark:from-tahoe-surface-dark dark:to-tahoe-surface-secondary p-4">
      <div className="w-full max-w-md">
        <div className="glass p-8 rounded-tahoe-xl text-center space-y-8">
          {/* Logo and Title */}
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-tahoe-lg bg-gradient-to-br from-macaw-red-500 to-macaw-green-500 flex items-center justify-center">
              <ClockIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-tahoe-text-primary-light dark:text-tahoe-text-primary-dark">
                ThisTracker
              </h1>
              <p className="text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark mt-2">
                Track your productivity with beautiful precision
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3 text-left">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-macaw-red-500"></div>
              <span className="text-sm text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                Beautiful macOS Tahoe-inspired interface
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-macaw-green-500"></div>
              <span className="text-sm text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                Light and dark mode support
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-macaw-blue-500"></div>
              <span className="text-sm text-tahoe-text-secondary-light dark:text-tahoe-text-secondary-dark">
                Google Calendar & Sheets integration
              </span>
            </div>
          </div>

          {/* Sign In Button */}
          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full tahoe-button-primary text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </div>
              )}
            </button>
            
            <p className="text-xs text-tahoe-text-muted text-center">
              By signing in, you agree to our terms of service and privacy policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
