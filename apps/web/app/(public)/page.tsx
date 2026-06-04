"use client";

import React, { Suspense, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FiActivity, FiShield, FiTool, FiZap } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { colors, components, gradients } from "@/app/ui-standards";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageShell />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { initiateLogin, isAuthenticated, loading } = useAuth();

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (searchParams.get("sessionExpired") === "1") {
      setError("Your session expired. Sign in again to continue.");
    }
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await initiateLogin({ username, password });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Unable to sign in with those credentials.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <LoginPageShell
      username={username}
      password={password}
      error={error}
      isSubmitting={isSubmitting}
      loading={loading}
      onUsernameChange={setUsername}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
    />
  );
}

function LoginPageShell({
  username = "",
  password = "",
  error = null,
  isSubmitting = false,
  loading = false,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}: {
  username?: string;
  password?: string;
  error?: string | null;
  isSubmitting?: boolean;
  loading?: boolean;
  onUsernameChange?: (value: string) => void;
  onPasswordChange?: (value: string) => void;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="relative min-h-screen overflow-x-hidden text-foreground">
      <div className="fixed inset-0" style={{ background: gradients.navyHeader }} />
      <div className="fixed inset-0 opacity-40" style={components.authAmbient} />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
        <div className="grid w-full max-w-7xl items-stretch gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <section className="login-pattern relative overflow-hidden rounded-[28px] border border-white/10 bg-white/8 p-6 text-white shadow-2xl backdrop-blur-sm sm:p-8 lg:p-10">
            <div
              className="absolute inset-y-0 right-0 w-1/2 opacity-80"
              style={{
                background:
                  "radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 55%), radial-gradient(circle at bottom right, rgba(255,255,255,0.08), transparent 45%)",
              }}
            />

            <div className="relative z-10 flex h-full flex-col justify-between gap-8">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80">
                    Electricity For Development
                  </div>

                  <div className="space-y-4">
                    <Image
                      src="/nored-logo.svg"
                      alt="NORED"
                      width={300}
                      height={120}
                      className="h-auto w-[220px] sm:w-[280px]"
                      priority
                    />
                    <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.02] sm:text-5xl xl:text-6xl">
                      NORED Desk keeps internal operations, approvals, and service requests in one place.
                    </h1>
                    <p className="max-w-xl text-sm leading-relaxed text-white/78 sm:text-base">
                      Sign in with your local NORED Desk credentials to manage daily work, track requests,
                      and keep teams aligned without relying on third-party sign-in.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <FeatureItem
                    icon={<FiZap className="h-5 w-5" />}
                    title="Operations workspace"
                    description="Centralize approvals, memos, and daily service coordination."
                  />
                  <FeatureItem
                    icon={<FiTool className="h-5 w-5" />}
                    title="Internal requests"
                    description="Keep support, resources, and workflows visible across teams."
                  />
                  <FeatureItem
                    icon={<FiActivity className="h-5 w-5" />}
                    title="Live oversight"
                    description="Track activity, notices, and performance from one dashboard."
                  />
                  <FeatureItem
                    icon={<FiShield className="h-5 w-5" />}
                    title="First-party access"
                    description="Use NORED-managed credentials with secure session cookies."
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/12 bg-black/10 p-4 text-xs leading-relaxed text-white/70">
                Access to NORED Desk is restricted to authorized users. All activity may be monitored and
                reviewed in line with internal governance, security, and operational control requirements.
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-[28px] border border-white/50 bg-white p-6 shadow-2xl sm:p-8">
              <div className="mb-6 flex justify-center">
                <Image
                  src="/nored-logo.svg"
                  alt="NORED"
                  width={260}
                  height={100}
                  className="h-auto w-[220px]"
                  priority
                />
              </div>

              <div className="mb-6 text-center">
                <p
                  className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em]"
                  style={{ color: colors.textSecondary }}
                >
                  Secure Sign-In
                </p>
                <h2 className="text-2xl font-bold" style={{ color: colors.textDark }}>
                  NORED Desk
                </h2>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                  Use your NORED Desk username or email address and password.
                </p>
              </div>

              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold" htmlFor="username" style={{ color: colors.textDark }}>
                    Username or Email
                  </label>
                  <Input
                    id="username"
                    autoComplete="username"
                    disabled={isSubmitting}
                    placeholder="e.g. admin or admin@nored.local"
                    value={username}
                    onChange={(event) => onUsernameChange?.(event.target.value)}
                    className="h-12 rounded-xl border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold" htmlFor="password" style={{ color: colors.textDark }}>
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => onPasswordChange?.(event.target.value)}
                    className="h-12 rounded-xl border-slate-200"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || loading}
                  className="h-12 w-full rounded-xl text-sm font-semibold shadow-lg transition-all hover:brightness-105"
                  style={components.buttonGold}
                >
                  {isSubmitting ? "Signing in..." : "Sign in to NORED Desk"}
                </Button>
              </form>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
                Local authentication is active. Contact the system administrator if you need your NORED Desk
                account created or your password reset.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
      <div
        className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl"
        style={{ backgroundColor: colors.goldSubtle, color: colors.gold }}
      >
        {icon}
      </div>
      <h3 className="mb-1 text-sm font-bold text-white">{title}</h3>
      <p className="text-xs leading-relaxed text-white/72">{description}</p>
    </div>
  );
}
