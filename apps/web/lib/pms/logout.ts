/**
 * Enhanced logout function that clears both local and Microsoft sessions
 * Redirects to server-side logout route which handles both NextAuth and Microsoft AD logout
 */
export async function logout() {
  // Set a flag to prevent new API calls during logout
  if (typeof window !== 'undefined') {
    window.__LOGOUT_IN_PROGRESS__ = true
    
    // Clear local storage and session storage
    localStorage.clear()
    sessionStorage.clear()
    
    // Clear all cookies related to session
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
    })
    
    // Redirect to our server-side logout route
    // This route will:
    // 1. Clear the NextAuth session cookie on the server
    // 2. Redirect to Microsoft logout to clear the AD session
    // 3. Microsoft will redirect back to our signin page
    window.location.href = '/api/auth/logout'
  }
}

// Global flag to check if logout is in progress
declare global {
  interface Window {
    __LOGOUT_IN_PROGRESS__?: boolean
  }
}