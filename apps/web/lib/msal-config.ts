/**
 * MINIMAL MSAL Configuration for SPA
 *
 * This config:
 * - Sets up MSAL for browser-only execution
 * - Configures OAuth2 redirect flow
 * - Does NOT make auth decisions
 * - Solely handles Microsoft authentication
 */

import { PublicClientApplication, Configuration } from "@azure/msal-browser";

const isBrowser = typeof window !== "undefined";

/**
 * Check if we're in a secure context (required for Web Crypto API)
 * Secure contexts: HTTPS, localhost, 127.0.0.1
 */
function isSecureContext(): boolean {
  if (!isBrowser) return false;
  
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  
  // Allow HTTPS, localhost, and internal/private network IPs
  if (
    protocol === 'https:' ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]'
  ) {
    return true;
  }
  
  // Allow private/internal network IPs (10.x, 172.16-31.x, 192.168.x)
  const privateIpPattern = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/;
  if (privateIpPattern.test(hostname)) {
    return true;
  }
  
  // window.isSecureContext is the official check
  if (typeof window.isSecureContext !== 'undefined') {
    return window.isSecureContext;
  }
  
  return false;
}

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
    redirectUri: process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI || "",
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
};

export const loginRequest = {
  scopes: [
    "openid", 
    "profile", 
    "email",
    "User.Read",           // Access /me endpoint (department, jobTitle, etc.)
    "User.ReadBasic.All",  // Access /me/manager endpoint
    "User.Read.All",       // Access /users/{id}/manager for bulk sync
    "Calendars.Read",      // Access /me/calendarView for Today's Meetings widget
    "Sites.Read.All",      // Access SharePoint lists for events & birthdays
  ],
};

let msalInstance: PublicClientApplication | null = null;

/**
 * Initialize MSAL - called once, globally
 */
export async function initializeMsal(): Promise<PublicClientApplication> {
  if (!isBrowser) {
    throw new Error("MSAL can only be initialized in browser");
  }

  // Check for secure context (required for Web Crypto API used by MSAL)
  if (!isSecureContext()) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    throw new Error(
      `crypto_nonexistent: Microsoft authentication requires a secure context (HTTPS). ` +
      `You are accessing from ${protocol}//${hostname} which is not secure. ` +
      `Please access via https:// or use localhost instead of IP address.`
    );
  }

  // Explicitly check for crypto API availability
  if (typeof window.crypto === 'undefined' || typeof window.crypto.subtle === 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    throw new Error(
      `crypto_nonexistent: Web Crypto API is not available. ` +
      `This is required for Microsoft authentication. ` +
      `Current context: ${protocol}//${hostname}. ` +
      `Please ensure you're accessing via HTTPS or localhost.`
    );
  }

  // Return existing instance
  if (msalInstance) {
    return msalInstance;
  }

  // Create and initialize instance
  msalInstance = new PublicClientApplication(msalConfig);
  await msalInstance.initialize();

  // Handle redirect from Microsoft (on /auth/entra page) and set active
  // account when a result is available so subsequent calls to
  // getAllAccounts()/getActiveAccount() see the authenticated user.
  try {
    const result = await msalInstance.handleRedirectPromise();
    if (result) {
      // Log everything returned from Microsoft Entra ID redirect handling
      console.log("[MSAL] handleRedirectPromise result:", result);
    }
    if (result && result.account) {
      console.log("[MSAL] Active account from redirect:", result.account);
      msalInstance.setActiveAccount(result.account);
    }
  } catch (e) {
    console.error("[MSAL] handleRedirectPromise error:", e);
  }

  return msalInstance;
}
