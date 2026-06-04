// Logout page for My Desk (Next.js App Router)
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Call the web app logout endpoint so browser auth requests stay same-origin.
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include", // Send cookies
        });
      } catch (error) {
        console.error("Logout error:", error);
      } finally {
        // Clear local storage
        sessionStorage.clear();
        localStorage.clear();

        // Redirect to login
        router.replace("/");
      }
    };

    performLogout();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-lg">Signing out...</p>
      </div>
    </div>
  );
}
