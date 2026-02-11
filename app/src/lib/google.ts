// Google OAuth and Gmail API utilities
// Direct integration without Aurinko

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_URL = "https://gmail.googleapis.com/gmail/v1";

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: { name: string; value: string }[];
    body?: { data?: string };
    parts?: { mimeType: string; body?: { data?: string } }[];
  };
  internalDate: string;
}

export interface GmailThread {
  id: string;
  historyId: string;
  messages: GmailMessage[];
}

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthUrl(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/google/callback`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId!,
      client_secret: clientSecret!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  return response.json();
}

/**
 * Refresh access token
 */
export async function refreshGoogleToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId!,
      client_secret: clientSecret!,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Google token refresh error:", response.status, errorBody);
    throw new Error(`Failed to refresh token: ${response.status} - ${errorBody}`);
  }

  return response.json();
}

/**
 * Get user info from Google
 */
export async function getGoogleUserInfo(accessToken: string): Promise<{ email: string; name?: string }> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
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
 * Get header value from Gmail message
 */
function getHeader(headers: { name: string; value: string }[], name: string): string {
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || "";
}

/**
 * Decode base64url encoded string
 */
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

/**
 * Extract body from Gmail message
 */
function extractBody(message: GmailMessage): { text: string; html?: string } {
  let text = "";
  let html: string | undefined;

  // Check direct body
  if (message.payload.body?.data) {
    text = decodeBase64Url(message.payload.body.data);
  }

  // Check parts
  if (message.payload.parts) {
    for (const part of message.payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        text = decodeBase64Url(part.body.data);
      }
      if (part.mimeType === "text/html" && part.body?.data) {
        html = decodeBase64Url(part.body.data);
      }
    }
  }

  return { text: text || message.snippet, html };
}

/**
 * Determine folder from Gmail labels
 */
function getFolderFromLabels(labelIds: string[]): "INBOX" | "SENT" | "DRAFTS" | "TRASH" {
  if (labelIds.includes("TRASH")) return "TRASH";
  if (labelIds.includes("DRAFT")) return "DRAFTS";
  if (labelIds.includes("SENT")) return "SENT";
  return "INBOX";
}

/**
 * Fetch messages from Gmail API using batching for performance.
 */
export async function fetchGmailMessages(
  accessToken: string,
  options: { maxResults?: number; labelIds?: string[] } = {}
): Promise<GmailMessage[]> {
  const { maxResults = 20, labelIds = [] } = options;

  // 1. Get list of message IDs
  const params = new URLSearchParams();
  params.set("maxResults", String(maxResults));
  if (labelIds.length > 0) {
    labelIds.forEach((id) => params.append("labelIds", id));
  }

  const listResponse = await fetch(
    `${GMAIL_API_URL}/users/me/messages?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!listResponse.ok) {
    const error = await listResponse.text();
    throw new Error(`Failed to fetch messages: ${error}`);
  }

  const listData = await listResponse.json();
  const messageIds: { id: string; threadId: string }[] = listData.messages || [];

  // 2. Create a batch request to fetch full message details
  const batchUrl = new URL("https://www.googleapis.com/batch/gmail/v1");
  const boundary = "batch_boundary";
  let batchBody = "";

  for (const message of messageIds.slice(0, maxResults)) {
    batchBody += `--${boundary}\n`;
    batchBody += `Content-Type: application/http\n`;
    batchBody += `Content-ID: <${message.id}>\n\n`;
    batchBody += `GET /gmail/v1/users/me/messages/${message.id}?format=full\n\n`;
  }
  batchBody += `--${boundary}--`;

  const batchResponse = await fetch(batchUrl.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/mixed; boundary=${boundary}`,
    },
    body: batchBody,
  });

  if (!batchResponse.ok) {
    const error = await batchResponse.text();
    throw new Error(`Batch fetch failed: ${error}`);
  }

  // 3. Parse the multipart batch response
  const batchText = await batchResponse.text();
  const responseBoundary = batchResponse.headers.get("Content-Type")?.match(/boundary=(.+)/)?.[1];
  if (!responseBoundary) {
    throw new Error("Could not find boundary in batch response");
  }

  const parts = batchText.split(`--${responseBoundary}`);
  const messages: GmailMessage[] = [];

  for (const part of parts) {
    if (part.trim() === "" || part.trim() === "--") continue;

    // Find the start of the JSON content
    const jsonStart = part.indexOf("{");
    if (jsonStart !== -1) {
      const jsonPart = part.substring(jsonStart);
      try {
        const messageData = JSON.parse(jsonPart);
        // Only include valid Gmail messages (skip error responses)
        if (messageData.id && messageData.payload?.headers) {
          messages.push(messageData);
        } else if (messageData.error) {
          console.warn("Batch sub-request error:", messageData.error.message || messageData.error);
        }
      } catch (e) {
        console.warn("Failed to parse JSON part of batch response");
      }
    }
  }

  return messages;
}

/**
 * Parse Gmail message to our format
 */
export function parseGmailMessage(message: GmailMessage) {
  const headers = message.payload?.headers || [];
  const body = extractBody(message);

  return {
    id: message.id,
    threadId: message.threadId,
    subject: getHeader(headers, "Subject") || "(No subject)",
    from: getHeader(headers, "From"),
    to: getHeader(headers, "To"),
    date: new Date(parseInt(message.internalDate)),
    snippet: message.snippet,
    body: body.text,
    bodyHtml: body.html,
    labels: message.labelIds,
    folder: getFolderFromLabels(message.labelIds),
    isRead: !message.labelIds.includes("UNREAD"),
  };
}

/**
 * Send an email via Gmail API
 */
export async function sendGmail(
  accessToken: string,
  options: {
    to: string;
    subject: string;
    body: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
  }
): Promise<void> {
  const { to, subject, body, threadId, inReplyTo, references } = options;

  // RFC 2822 formatted email
  let email = `To: ${to}\r\n`;
  email += `Subject: ${subject}\r\n`;
  if (inReplyTo) {
    email += `In-Reply-To: ${inReplyTo}\r\n`;
  }
  if (references) {
    email += `References: ${references}\r\n`;
  }
  email += `Content-Type: text/html; charset=utf-8\r\n\r\n`;
  email += body;

  const encodedEmail = Buffer.from(email).toString("base64url");

  const sendUrl = new URL(`${GMAIL_API_URL}/users/me/messages/send`);
  const response = await fetch(sendUrl.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: encodedEmail,
      ...(threadId && { threadId }), // Add to thread if replying
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Failed to send email:", error);
    throw new Error(error.error?.message || "Failed to send email");
  }
}
