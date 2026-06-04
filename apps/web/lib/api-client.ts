import { useAuth } from "./auth-context";

class APIError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "APIError";
  }
}

export interface APIClientConfig {
  baseURL: string;
  timeout?: number;
}

class APIClient {
  private baseURL: string;
  private timeout: number;
  private getAuthToken: (() => string | null) | null = null;
  private onTokenRefresh: (() => Promise<void>) | null = null;

  constructor(config: APIClientConfig) {
    this.baseURL = config.baseURL || "/api";
    this.timeout = config.timeout || 10000;
  }

  setAuthCallbacks(
    getToken: () => string | null,
    onRefresh: () => Promise<void>,
  ) {
    this.getAuthToken = getToken;
    this.onTokenRefresh = onRefresh;
  }

  private async makeRequest<T>(
    method: string,
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    // Add auth token if available
    if (this.getAuthToken) {
      const token = this.getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        // Token expired, try to refresh
        if (this.onTokenRefresh) {
          try {
            await this.onTokenRefresh();
            // Retry the request
            return this.makeRequest<T>(method, endpoint, options);
          } catch (error) {
            throw new APIError(401, "Authentication failed");
          }
        }
        throw new APIError(401, "Unauthorized");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          response.status,
          errorData.message || `HTTP ${response.status}`,
        );
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof APIError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new APIError(408, "Request timeout");
      }
      throw new APIError(
        500,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.makeRequest<T>("GET", endpoint, options);
  }

  async post<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit,
  ): Promise<T> {
    return this.makeRequest<T>("POST", endpoint, {
      ...options,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit,
  ): Promise<T> {
    return this.makeRequest<T>("PUT", endpoint, {
      ...options,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit,
  ): Promise<T> {
    return this.makeRequest<T>("PATCH", endpoint, {
      ...options,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.makeRequest<T>("DELETE", endpoint, options);
  }
}

// Create singleton instance
export const apiClient = new APIClient({
  baseURL: "/api",
  timeout: 10000,
});

// Hook to initialize API client with auth
export function useAPIClient() {
  const { user } = useAuth();
  
  // For now, we'll use session-based auth via cookies
  // The backend handles authentication with session cookies
  // No need to set authorization headers since we're using cookies
  
  return apiClient;
}

export { APIError };
