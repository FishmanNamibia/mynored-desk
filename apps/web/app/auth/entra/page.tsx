"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthLoading } from "@/components/auth-loading";

export default function AuthEntraPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <AuthLoading
      title="Redirecting"
      description="Microsoft sign-in is disabled. Use your NORED Desk username or email and password."
    />
  );
}
