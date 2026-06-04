/**
 * MSAL Direct Flow Test
 *
 * Tests MSAL loginRedirect directly without any wrappers.
 * This helps identify if MSAL itself is the problem or our usage.
 */

"use client";

import { useEffect, useState } from "react";
import { PublicClientApplication, LogLevel } from "@azure/msal-browser";

const TENANT_ID = process.env.NEXT_PUBLIC_AZURE_TENANT_ID;
const CLIENT_ID = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI;

export default function DirectMsalTestPage() {
  const [instance, setInstance] = useState<PublicClientApplication | null>(
    null,
  );
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log(`[DIRECT MSAL TEST] ${msg}`);
    setLogs((prev) => [...prev, msg]);
  };

  useEffect(() => {
    const initMsal = async () => {
      try {
        addLog("Creating PublicClientApplication...");

        const config = {
          auth: {
            clientId: CLIENT_ID || "",
            authority: `https://login.microsoftonline.com/${TENANT_ID}`,
            redirectUri: REDIRECT_URI || "",
          },
          cache: {
            cacheLocation: "sessionStorage" as const,
          },
          system: {
            loggerOptions: {
              loggerCallback: (level: LogLevel, message: string) => {
                addLog(`[MSAL] ${message}`);
              },
              piiLoggingEnabled: false,
              logLevel: LogLevel.Info,
            },
            allowNativeBroker: false,
          },
        };

        addLog(
          `Config: clientId=${CLIENT_ID?.slice(
            0,
            8,
          )}..., tenant=${TENANT_ID?.slice(0, 8)}...`,
        );
        addLog(`Redirect URI: ${REDIRECT_URI}`);

        const app = new PublicClientApplication(config);
        addLog("PublicClientApplication created");

        await app.initialize();
        addLog("MSAL initialized");

        const result = await app.handleRedirectPromise();
        addLog(
          `handleRedirectPromise result: ${
            result ? "has redirect" : "no redirect"
          }`,
        );

        setInstance(app);
        addLog("Ready for login");
      } catch (err) {
        addLog(
          `ERROR during init: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    };

    initMsal();
  }, []);

  const handleLoginClick = async () => {
    if (!instance) {
      addLog("ERROR: Instance not ready");
      return;
    }

    try {
      const redirectUri = `${window.location.origin}/auth/entra`;
      addLog(`Calling loginRedirect() with redirectUri=${redirectUri}`);
      await instance.loginRedirect({
        scopes: ["openid", "profile", "email"],
        redirectUri,
      });
      addLog("loginRedirect() completed (browser should redirect now)");
    } catch (err) {
      addLog(
        `ERROR during loginRedirect: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Direct MSAL Test</h1>

        <div className="mb-6 p-4 bg-blue-900 rounded border border-blue-700">
          <p className="text-white text-sm">
            <strong>This page tests MSAL directly without wrappers.</strong>
            <br />
            If the login button works here, the issue is in our MSAL usage
            elsewhere.
            <br />
            If it doesn't work here, the issue is with Azure Portal
            configuration.
          </p>
        </div>

        <button
          onClick={handleLoginClick}
          disabled={!instance}
          className="mb-6 px-6 py-3 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:bg-gray-600"
        >
          {instance ? "Click to Login (Direct)" : "Initializing..."}
        </button>

        <div className="bg-black text-green-400 p-6 rounded font-mono text-sm overflow-auto max-h-96 border border-green-700">
          {logs.length === 0 ? (
            <p className="text-gray-500">Logs appear here...</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="py-1 whitespace-pre-wrap">
                {log}
              </div>
            ))
          )}
        </div>

        <div className="mt-6 text-gray-300 text-sm">
          <p className="mb-2">
            <strong>Expected behavior:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Logs show "Ready for login"</li>
            <li>Click the green button</li>
            <li>Browser redirects to Microsoft login page</li>
            <li>Sign in with your account</li>
            <li>Redirected to http://localhost:3080/auth/entra</li>
          </ol>
        </div>

        <a href="/" className="mt-8 inline-block text-blue-400 hover:underline">
          ← Back to Login
        </a>
      </div>
    </div>
  );
}
