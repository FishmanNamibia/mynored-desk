'use client'

import { useState } from 'react'

export default function SyncManagersPage() {
  const [status, setStatus] = useState<string>('')

  const handleSync = async () => {
    setStatus('Manager sync requires Microsoft Graph and is disabled while local authentication is active.')
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Sync Manager Relationships</h1>
      <p className="text-gray-600 mb-6">
        This action depends on Microsoft Graph manager data. Because NORED Desk is currently
        running with local first-party authentication, Graph-based manager synchronization is
        disabled in this environment.
      </p>

      <button
        onClick={handleSync}
        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
      >
        Show Sync Status
      </button>

      {status && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <p className="font-medium">{status}</p>
        </div>
      )}
    </div>
  )
}
