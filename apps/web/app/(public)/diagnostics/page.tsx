/**
 * MSAL Diagnostics
 *
 * Shows what MSAL is configured with.
 * Use this to verify your env vars are correct.
 */

"use client";

import { useEffect, useState } from "react";

export default function DiagnosticsPage() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    setConfig({
      tenantId: process.env.NEXT_PUBLIC_AZURE_TENANT_ID,
      clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID,
      redirectUri: process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI,
      apiUrl: process.env.NEXT_PUBLIC_API_URL,
      scope: process.env.NEXT_PUBLIC_AZURE_API_SCOPE,
    });
  }, []);

  if (!config) return <div>Loading...</div>;

  const isValid =
    config.tenantId && config.clientId && config.redirectUri && config.apiUrl;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-6">
          MSAL Configuration Diagnostics
        </h1>

        <div className="space-y-4">
          <ConfigItem
            name="Tenant ID"
            value={config.tenantId}
            required={true}
          />
          <ConfigItem
            name="Client ID"
            value={config.clientId}
            required={true}
          />
          <ConfigItem
            name="Redirect URI"
            value={config.redirectUri}
            required={true}
            note="Must match exactly in Azure Portal → Authentication"
          />
          <ConfigItem name="API URL" value={config.apiUrl} required={true} />
          <ConfigItem name="API Scope" value={config.scope} required={false} />
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>Authority URL:</strong>
            <br />
            <code>https://login.microsoftonline.com/{config.tenantId}</code>
          </p>
        </div>

        <div className="mt-8">
          {isValid ? (
            <div className="p-4 bg-green-50 rounded border border-green-200">
              <p className="text-green-900 font-semibold">
                ✓ Configuration looks valid
              </p>
            </div>
          ) : (
            <div className="p-4 bg-red-50 rounded border border-red-200">
              <p className="text-red-900 font-semibold">
                ✗ Missing required configuration
              </p>
              <ul className="mt-2 text-sm text-red-800 list-disc list-inside">
                {!config.tenantId && <li>NEXT_PUBLIC_AZURE_TENANT_ID</li>}
                {!config.clientId && <li>NEXT_PUBLIC_AZURE_CLIENT_ID</li>}
                {!config.redirectUri && <li>NEXT_PUBLIC_AZURE_REDIRECT_URI</li>}
                {!config.apiUrl && <li>NEXT_PUBLIC_API_URL</li>}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-8 text-sm text-gray-600">
          <h3 className="font-bold mb-2">Steps to fix:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open apps/web/.env.local</li>
            <li>Verify all 4 variables are set</li>
            <li>Save and restart: npm run dev</li>
            <li>Return to / and click "Sign In"</li>
          </ol>
        </div>

        <a href="/" className="mt-8 inline-block text-blue-600 hover:underline">
          ← Back to Login
        </a>
      </div>
    </div>
  );
}

function ConfigItem({
  name,
  value,
  required,
  note,
}: {
  name: string;
  value: string;
  required: boolean;
  note?: string;
}) {
  const isSet = !!value;
  const status = isSet ? "✓" : "✗";
  const statusColor = isSet ? "text-green-600" : "text-red-600";

  return (
    <div className="border rounded p-4">
      <div className="flex items-center gap-2">
        <span className={`font-bold ${statusColor}`}>{status}</span>
        <span className="font-semibold">{name}</span>
        {required && <span className="text-red-600 text-sm">(required)</span>}
      </div>
      {isSet && (
        <code className="block text-sm bg-gray-100 p-2 rounded mt-2 break-all">
          {value}
        </code>
      )}
      {!isSet && (
        <p className="text-sm text-red-600 mt-2">Not set in environment</p>
      )}
      {note && <p className="text-xs text-gray-600 mt-2">{note}</p>}
    </div>
  );
}
