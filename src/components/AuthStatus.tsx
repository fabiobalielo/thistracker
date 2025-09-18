"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function AuthStatus() {
  const { data: session, status } = useSession();
  const [apiStatus, setApiStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );

  useEffect(() => {
    const testApi = async () => {
      try {
        const response = await fetch("/api/clients");
        if (response.ok) {
          setApiStatus("success");
        } else {
          setApiStatus("error");
        }
      } catch (error) {
        setApiStatus("error");
      }
    };

    if (status === "authenticated") {
      testApi();
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-3"></div>
          <span className="text-yellow-800">Checking authentication...</span>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
        <div className="flex items-center">
          <span className="text-red-800">
            Please sign in to access your time tracking data.
          </span>
        </div>
      </div>
    );
  }

  if (apiStatus === "loading") {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-blue-800">
            Testing Google APIs connection...
          </span>
        </div>
      </div>
    );
  }

  if (apiStatus === "error") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
        <div className="flex items-center">
          <span className="text-red-800">
            Google APIs connection failed. Please sign out and sign in again to
            refresh permissions.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
      <div className="flex items-center">
        <span className="text-green-800">
          ✅ Connected to Google APIs successfully!
        </span>
      </div>
    </div>
  );
}
