/**
 * MSAL Direct Test
 *
 * Tests loginRedirect() directly to see what happens.
 * Open browser console to see detailed logs.
 */

"use client";

import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";

export default function TestMsalPage() {
  const { instance, inProgress, accounts } = useMsal();
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log(`[MSAL TEST] ${msg}`);
    setLogs((prev) => [...prev, msg]);
  };

  useEffect(() => {
    addLog(`MSAL inProgress: ${inProgress}`);
    addLog(`MSAL accounts: ${accounts.length}`);
    addLog(`MSAL instance: ${instance ? "initialized" : "null"}`);
  }, [inProgress, accounts, instance]);

  const handleTestRedirect = async () => {
    try {
      addLog("Starting loginRedirect()...");

      if (inProgress !== InteractionStatus.None) {
        addLog(`ERROR: MSAL interaction in progress: ${inProgress}`);
        return;
      }

      const redirectUri = `${window.location.origin}/auth/entra`;
      addLog(
        `Calling instance.loginRedirect() with redirectUri=${redirectUri}`,
      );
      await instance.loginRedirect({
        scopes: ["openid", "profile", "email"],
        redirectUri,
      });

      addLog("loginRedirect() completed");
    } catch (err) {
      addLog(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-6">MSAL Test</h1>

        <div className="mb-6 p-4 bg-blue-50 rounded border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>Current State:</strong>
          </p>
          <ul className="text-sm text-blue-900 mt-2 space-y-1">
            <li>
              inProgress: <code>{inProgress}</code>
            </li>
            <li>
              Accounts: <code>{accounts.length}</code>
            </li>
            <li>
              Instance ready: <code>{instance ? "yes" : "no"}</code>
            </li>
          </ul>
        </div>

        <button
          onClick={handleTestRedirect}
          disabled={!instance || inProgress !== InteractionStatus.None}
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          Click to Test loginRedirect()
        </button>

        <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm overflow-auto max-h-96">
          {logs.length === 0 ? (
            <p className="text-gray-500">Logs appear here...</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="py-1">
                {log}
              </div>
            ))
          )}
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <p className="mb-2">
            <strong>What should happen:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click "Click to Test loginRedirect()"</li>
            <li>Browser redirects to Microsoft login</li>
            <li>Sign in with your account</li>
            <li>Microsoft redirects to http://localhost:3080/auth/entra</li>
          </ol>
        </div>

        <a href="/" className="mt-6 inline-block text-blue-600 hover:underline">
          ← Back to Login
        </a>
      </div>
    </div>
  );
}
