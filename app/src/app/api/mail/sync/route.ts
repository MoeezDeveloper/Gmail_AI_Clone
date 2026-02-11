import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchMessages, fetchMessage, AurinkoMessage } from "@/lib/aurinko";

// Helper to determine folder from labels
function getFolderFromLabels(labels?: string[]): "INBOX" | "SENT" | "DRAFTS" | "TRASH" {
  if (!labels) return "INBOX";
  if (labels.includes("TRASH")) return "TRASH";
  if (labels.includes("DRAFT")) return "DRAFTS";
  if (labels.includes("SENT")) return "SENT";
  return "INBOX";
}

// Helper to create snippet from body
function createSnippet(body?: string, maxLength: number = 100): string {
  if (!body) return "";
  // Strip HTML tags if present
  const text = body.replace(/<[^>]*>/g, "").trim();
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, accountId } = body;

    // Find account to sync
    let account;
    if (accountId) {
      account = await prisma.account.findUnique({
        where: { id: accountId },
        include: { user: true },
      });
    } else if (userId) {
      account = await prisma.account.findFirst({
        where: { userId },
        include: { user: true },
      });
    } else {
      // Get first account (for demo purposes)
      account = await prisma.account.findFirst({
        include: { user: true },
      });
    }

    if (!account) {
      return NextResponse.json(
        { error: "No account found. Please connect your email first." },
        { status: 404 }
      );
    }

    const accessToken = account.accessToken;
    const user = account.user;

    // Fetch messages from Aurinko
    let messagesResponse;
    try {
      messagesResponse = await fetchMessages(accessToken, {
        maxResults: 50,
      });
    } catch (fetchError) {
      const errorMsg = fetchError instanceof Error ? fetchError.message : "Unknown error";
      console.error("Aurinko fetch error:", errorMsg);
      
      // Check for specific errors
      if (errorMsg.includes("SERVICE_DISABLED") || errorMsg.includes("Gmail API")) {
        return NextResponse.json(
          { 
            error: "Gmail API is not enabled. Please check your Aurinko dashboard settings or reconnect your account.",
            details: "The Gmail API needs to be enabled in your Aurinko application configuration."
          },
          { status: 403 }
        );
      }
      
      if (errorMsg.includes("401") || errorMsg.includes("Unauthorized")) {
        return NextResponse.json(
          { 
            error: "Access token expired. Please reconnect your Gmail account.",
            needsReauth: true
          },
          { status: 401 }
        );
      }
      
      throw fetchError;
    }

    if (!messagesResponse.messages || messagesResponse.messages.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: "No messages found in your inbox",
      });
    }

    let syncedCount = 0;

    for (const msg of messagesResponse.messages) {
      // Fetch full message details
      let fullMessage: AurinkoMessage;
      try {
        fullMessage = await fetchMessage(accessToken, msg.id);
      } catch {
        // If we can't fetch full message, use the summary
        fullMessage = msg;
      }

      const folder = getFolderFromLabels(fullMessage.labels);

      // Upsert thread
      const thread = await prisma.thread.upsert({
        where: { externalId: fullMessage.threadId },
        update: {
          subject: fullMessage.subject || "(No subject)",
          snippet: createSnippet(fullMessage.bodySnippet || fullMessage.body),
          folder,
          lastMessageAt: new Date(fullMessage.date),
          updatedAt: new Date(),
        },
        create: {
          externalId: fullMessage.threadId,
          subject: fullMessage.subject || "(No subject)",
          snippet: createSnippet(fullMessage.bodySnippet || fullMessage.body),
          folder,
          lastMessageAt: new Date(fullMessage.date),
          userId: user.id,
        },
      });

      // Upsert email
      await prisma.email.upsert({
        where: { externalId: fullMessage.id },
        update: {
          from: fullMessage.from.email,
          to: fullMessage.to.map((t) => t.email).join(", "),
          subject: fullMessage.subject || "(No subject)",
          body: fullMessage.body || fullMessage.bodySnippet || "",
          bodyHtml: fullMessage.bodyHtml,
          isRead: fullMessage.isRead,
          sentAt: new Date(fullMessage.date),
          threadId: thread.id,
        },
        create: {
          externalId: fullMessage.id,
          from: fullMessage.from.email,
          to: fullMessage.to.map((t) => t.email).join(", "),
          subject: fullMessage.subject || "(No subject)",
          body: fullMessage.body || fullMessage.bodySnippet || "",
          bodyHtml: fullMessage.bodyHtml,
          isRead: fullMessage.isRead,
          sentAt: new Date(fullMessage.date),
          threadId: thread.id,
          userId: user.id,
        },
      });

      syncedCount++;
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      message: `Synced ${syncedCount} emails`,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // GET request triggers sync for the first available account
  return POST(new Request("", { method: "POST", body: "{}" }));
}
