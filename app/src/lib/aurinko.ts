// Aurinko OAuth and API utilities
// Docs: https://docs.aurinko.io/

const AURINKO_BASE_URL = "https://api.aurinko.io/v1";

export interface AurinkoTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  accountId: string;
  userSession?: string;
}

export interface AurinkoUserInfo {
  email: string;
  name?: string;
}

export interface AurinkoMessage {
  id: string;
  threadId: string;
  subject: string;
  from: { email: string; name?: string };
  to: { email: string; name?: string }[];
  date: string;
  bodySnippet?: string;
  body?: string;
  bodyHtml?: string;
  isRead: boolean;
  labels?: string[];
}

export interface AurinkoMessagesResponse {
  messages: AurinkoMessage[];
  nextPageToken?: string;
}

/**
 * Generate the Aurinko OAuth authorization URL
 */
export function getAurinkoAuthUrl(returnUrl: string = "/"): string {
  const clientId = process.env.AURINKO_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const callbackUrl = `${baseUrl}/api/aurinko/callback`;

  const params = new URLSearchParams({
    clientId: clientId!,
    serviceType: "Google",
    scopes: "Mail.ReadWrite Mail.Send Mail.Drafts",
    responseType: "code",
    returnUrl: callbackUrl,
    state: encodeURIComponent(returnUrl),
  });

  return `https://api.aurinko.io/v1/auth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string
): Promise<AurinkoTokenResponse> {
  const clientId = process.env.AURINKO_CLIENT_ID;
  const clientSecret = process.env.AURINKO_CLIENT_SECRET;

  const response = await fetch(`${AURINKO_BASE_URL}/auth/token/${code}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
    accountId: data.accountId.toString(),
  };
}

/**
 * Get user info from Aurinko
 */
export async function getAurinkoUserInfo(
  accessToken: string
): Promise<AurinkoUserInfo> {
  const response = await fetch(`${AURINKO_BASE_URL}/account`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get user info");
  }

  const data = await response.json();
  return {
    email: data.email,
    name: data.name,
  };
}

/**
 * Fetch messages from Aurinko
 */
export async function fetchMessages(
  accessToken: string,
  options: {
    pageToken?: string;
    maxResults?: number;
    folder?: string;
  } = {}
): Promise<AurinkoMessagesResponse> {
  const params = new URLSearchParams();
  if (options.pageToken) params.set("pageToken", options.pageToken);
  if (options.maxResults) params.set("maxResults", options.maxResults.toString());
  // Don't filter by folder - fetch all messages regardless of folder
  // This avoids the "inbox" vs "INBOX" case sensitivity issue

  console.log("Fetching messages from Aurinko...");

  const response = await fetch(
    `${AURINKO_BASE_URL}/email/messages?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch messages: ${error}`);
  }

  const data = await response.json();
  
  // Log each message subject for debugging
  if (data.messages && data.messages.length > 0) {
    console.log(`Found ${data.messages.length} messages:`);
    data.messages.forEach((msg: AurinkoMessage, i: number) => {
      console.log(`  ${i + 1}. Subject: ${msg.subject}`);
    });
  } else {
    console.log("No messages found in Aurinko response");
  }

  return data;
}

/**
 * Fetch a single message with full body
 */
export async function fetchMessage(
  accessToken: string,
  messageId: string
): Promise<AurinkoMessage> {
  const response = await fetch(
    `${AURINKO_BASE_URL}/email/messages/${messageId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch message ${messageId}`);
  }

  return response.json();
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<AurinkoTokenResponse> {
  const clientId = process.env.AURINKO_CLIENT_ID;
  const clientSecret = process.env.AURINKO_CLIENT_SECRET;

  const response = await fetch(`${AURINKO_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  return response.json();
}
