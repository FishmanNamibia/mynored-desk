'use client'

import React, { useState } from 'react'

interface DiagnosticData {
  summary: {
    totalUsers: number
    usersWithoutAssignments: number
    duplicateDeptAssignments: number
    duplicateOrgAssignments: number
  }
  issues: string[]
  recommendations: string[]
}

export default function Rating360Manager() {
  const [loading, setLoading] = useState(false)
  const [diagnostic, setDiagnostic] = useState<DiagnosticData | null>(null)
  const [message, setMessage] = useState('')

  const runDiagnostic = async () => {
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/360-rating/diagnostic')
      const data = await response.json()
      if (data.success) {
        setDiagnostic(data)
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (error) {
      setMessage(`Network error: ${error}`)
    }
    setLoading(false)
  }

  const clearAllRatings = async () => {
    if (!confirm('Are you sure you want to clear ALL 360 ratings? This cannot be undone.')) {
      return
    }
    
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/360-rating/clear-all-ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'CLEAR_ALL_360_RATINGS' })
      })
      const data = await response.json()
      if (data.success) {
        setMessage(`✅ Successfully cleared all ratings: ${data.deletedPeerRatings} peer ratings, ${data.deletedAnswers} answers, ${data.resetMainRatings} main ratings reset`)
        setDiagnostic(null) // Clear diagnostic data
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (error) {
      setMessage(`Network error: ${error}`)
    }
    setLoading(false)
  }

  const initializeAssignments = async (force = false) => {
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/360-rating/init-random-raters-fixed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force })
      })
      const data = await response.json()
      if (data.success) {
        setMessage(`✅ ${data.message}`)
        if (data.assignmentLog && data.assignmentLog.length > 0) {
          console.log('Assignment Log:', data.assignmentLog)
        }
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (error) {
      setMessage(`Network error: ${error}`)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">360° Rating Management</h1>
      
      {message && (
        <div className={`p-4 rounded mb-6 ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={runDiagnostic}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Running...' : '🔍 Run Diagnostic'}
        </button>

        <button
          onClick={clearAllRatings}
          disabled={loading}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
        >
          {loading ? 'Clearing...' : '🗑️ Clear All Ratings'}
        </button>

        <button
          onClick={() => initializeAssignments(false)}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Initializing...' : '👥 Initialize Assignments'}
        </button>

        <button
          onClick={() => initializeAssignments(true)}
          disabled={loading}
          className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? 'Force Re-initializing...' : '🔄 Force Re-initialize'}
        </button>
      </div>

      {diagnostic && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Diagnostic Results</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{diagnostic.summary.totalUsers}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{diagnostic.summary.usersWithoutAssignments}</div>
              <div className="text-sm text-gray-600">No Assignments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{diagnostic.summary.duplicateDeptAssignments}</div>
              <div className="text-sm text-gray-600">Duplicate Dept</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{diagnostic.summary.duplicateOrgAssignments}</div>
              <div className="text-sm text-gray-600">Duplicate Org</div>
            </div>
          </div>

          {diagnostic.issues.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-red-600 mb-2">Issues Found:</h3>
              <ul className="list-disc list-inside text-sm space-y-1">
                {diagnostic.issues.slice(0, 10).map((issue, i) => (
                  <li key={i} className="text-gray-700">{issue}</li>
                ))}
                {diagnostic.issues.length > 10 && (
                  <li className="text-gray-500">... and {diagnostic.issues.length - 10} more issues</li>
                )}
              </ul>
            </div>
          )}

          {diagnostic.recommendations.length > 0 && (
            <div>
              <h3 className="font-semibold text-blue-600 mb-2">Recommendations:</h3>
              <ul className="list-disc list-inside text-sm space-y-1">
                {diagnostic.recommendations.map((rec, i) => (
                  <li key={i} className="text-gray-700">{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
