/**
 * Authentication Loading Screen
 *
 * Displays while authentication state is being restored
 */

import Image from "next/image";
import { colors, gradients, components } from "@/app/ui-standards";
import { GoldSpinner } from "@/components/ui/gold-spinner";

interface AuthLoadingProps {
  title?: string;
  description?: string;
}

export function AuthLoading({ title, description }: AuthLoadingProps) {
  return (
    <main className="relative min-h-screen flex flex-col">
      {/* Branded background */}
      <div 
        className="absolute inset-0"
        style={{
          background: gradients.navyHeader
        }}
      />
      {/* Ambient blur overlay */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          ...components.authAmbient
        }}
      />

      {/* Top Header */}
      <header className="relative z-10 w-full py-6 text-center text-white">
        <p className="text-sm uppercase tracking-[0.25em] font-semibold mb-1" style={{ color: colors.textMuted }}>
          Electricity For Development
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-white">
          NORED Desk
        </h1>
      </header>

      {/* Centered loading card */}
      <div className="relative z-10 w-full px-4 flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-md bg-white rounded-md p-10 shadow-2xl text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <Image
              src="/nored-logo.svg"
              alt="NORED Logo"
              width={240}
              height={96}
              className="h-auto w-52 object-contain"
              priority
            />
          </div>

          {/* Heading */}
          <h2 className="text-3xl font-bold mb-4 text-slate-800">
            {title ?? "Initializing your workspace"}
          </h2>
          <p className="text-base leading-relaxed mb-10 text-slate-600 max-w-sm mx-auto">
            {description ??
              "We are preparing your NORED Desk session."}
          </p>

          {/* Loading animation */}
          <div className="mb-10">
            <GoldSpinner size="lg" />
          </div>

          <div className="flex items-center justify-center gap-3 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500">
            <span className="font-medium">Secure local authentication is active</span>
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * Authentication Error Screen
 *
 * Displays when MSAL initialization fails
 */
export function AuthError({ error }: { error: string }) {
  const handleReturnHome = () => {
    window.location.href = "/";
  };

  return (
    <main className="relative min-h-screen flex flex-col">
      {/* Branded background */}
      <div 
        className="absolute inset-0"
        style={{
          background: gradients.navyHeader
        }}
      />
      {/* Ambient blur overlay */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          ...components.authAmbient
        }}
      />

      {/* Top Header */}
      <header className="relative z-10 w-full py-6 text-center text-white">
        <p className="text-sm uppercase tracking-[0.25em] font-semibold mb-1" style={{ color: colors.textMuted }}>
          Electricity For Development
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-white">
          NORED Desk
        </h1>
      </header>

      <div className="relative z-10 w-full px-4 flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-md bg-white rounded-md p-10 shadow-2xl text-center">
          {/* Error Icon */}
          <div className="mb-8 flex justify-center">
            <svg
              className="w-16 h-16"
              style={{ color: colors.error }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a1 1 0 00.86 1.5h18.64a1 1 0 00.86-1.5L13.71 3.86a1 1 0 00-1.72 0z"
              />
            </svg>
          </div>

          {/* Error Title */}
          <h2 className="text-3xl font-bold mb-4 text-slate-800">
            Authentication Error
          </h2>
          <p className="text-base mb-8 text-slate-600 max-w-sm mx-auto">
            We couldn't complete your sign-in.
          </p>

          {/* Error Message (scrollable) */}
          <div 
            className="rounded-md p-5 mb-8 text-left max-h-48 overflow-auto border shadow-inner"
            style={components.errorBox}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-red-700 font-mono">
              {error}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <button
              onClick={handleReturnHome}
              className="w-full h-14 font-semibold rounded-md text-base transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              style={components.buttonPrimary}
            >
              Return to Login
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full h-14 font-semibold rounded-md text-base transition-all border-2 bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400 transform hover:scale-105"
            >
              Try Again
            </button>
            <p className="text-sm text-center pt-3 text-slate-500 leading-relaxed">
              If the problem persists, please contact IT support and include the
              details above.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
