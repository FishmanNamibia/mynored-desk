// Enhanced fetch wrapper that respects logout state
export async function apiClient(url: string, options: RequestInit = {}): Promise<Response> {
  // Check if logout is in progress
  if (typeof window !== 'undefined' && window.__LOGOUT_IN_PROGRESS__) {
    throw new Error('Logout in progress - API calls cancelled');
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  // If we get a 401 and logout is not already in progress, handle it
  if (response.status === 401 && typeof window !== 'undefined' && !window.__LOGOUT_IN_PROGRESS__) {
    // Import logout dynamically to avoid circular dependencies
    const { logout } = await import('./logout');
    logout();
    throw new Error('Session expired - logging out');
  }
  
  return response;
}

// Helper function for GET requests
export async function apiGet(url: string): Promise<any> {
  try {
    const response = await apiClient(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    // Silently fail if logout is in progress
    if (typeof window !== 'undefined' && window.__LOGOUT_IN_PROGRESS__) {
      return null;
    }
    throw error;
  }
}

// Helper function for POST requests
export async function apiPost(url: string, data: any): Promise<any> {
  try {
    const response = await apiClient(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    // Silently fail if logout is in progress
    if (typeof window !== 'undefined' && window.__LOGOUT_IN_PROGRESS__) {
      return null;
    }
    throw error;
  }
}