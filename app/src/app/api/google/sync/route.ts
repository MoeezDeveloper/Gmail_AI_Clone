import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchGmailMessages, parseGmailMessage, refreshGoogleToken } from "@/lib/google";
import { auth } from "@/lib/auth";

// Run promises in batches to avoid exhausting Supabase connection pool
async function batchAll<T>(tasks: (() => Promise<T>)[], batchSize = 5): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn => fn()));
    results.push(...batchResults);
  }
  return results;
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find Google account
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "google"
      },
      include: { user: true },
    });

    if (!account) {
      return NextResponse.json(
        { error: "No Google account found. Please connect your Gmail first." },
        { status: 404 }
      );
    }

    let accessToken = account.access_token;
    const user = account.user;

    // Check if token is expired and refresh if needed
    // expires_at is in seconds (Int)
    if (account.expires_at && (Date.now() / 1000) > account.expires_at) {
      if (!account.refresh_token) {
        return NextResponse.json(
          { error: "Token expired and no refresh token available. Please reconnect.", needsReauth: true },
          { status: 401 }
        );
      }

      try {
        const newTokens = await refreshGoogleToken(account.refresh_token);
        accessToken = newTokens.access_token;

        // Update tokens in database
        await prisma.account.update({
          where: { id: account.id },
          data: {
            access_token: newTokens.access_token,
            expires_at: Math.floor(Date.now() / 1000 + newTokens.expires_in),
          },
        });
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        return NextResponse.json(
          { error: "Failed to refresh token. Please reconnect.", needsReauth: true },
          { status: 401 }
        );
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: "Access token missing" }, { status: 401 });
    }

    // Fetch messages from Gmail
    const messages = await fetchGmailMessages(accessToken, { maxResults: 20 });

    if (messages.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: "No messages found",
      });
    }

    // Parse all messages first
    const parsed = messages.map(parseGmailMessage);

    // Group by threadId to avoid duplicate thread upserts
    const threadMap = new Map<string, typeof parsed>();
    for (const p of parsed) {
      if (!threadMap.has(p.threadId)) {
        threadMap.set(p.threadId, []);
      }
      threadMap.get(p.threadId)!.push(p);
    }

    // Upsert threads in batches of 5 (avoids exhausting Supabase pgbouncer pool)
    const threadEntries = Array.from(threadMap.entries());
    const threadResults = await batchAll(
      threadEntries.map(([threadId, emails]) => () => {
        const latest = emails.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
        return prisma.thread.upsert({
          where: { externalId: threadId },
          update: {
            subject: latest.subject,
            snippet: latest.snippet,
            folder: latest.folder,
            lastMessageAt: latest.date,
          },
          create: {
            externalId: threadId,
            subject: latest.subject,
            snippet: latest.snippet,
            folder: latest.folder,
            lastMessageAt: latest.date,
            userId: user.id,
          },
        });
      })
    );

    // Build map of externalId -> db thread id
    const threadIdMap = new Map<string, string>();
    for (const t of threadResults) {
      if (t.externalId) {
        threadIdMap.set(t.externalId, t.id);
      }
    }

    // Upsert all emails in batches of 5
    const emailTasks = parsed
      .filter((p) => threadIdMap.has(p.threadId))
      .map((p) => () => {
        const dbThreadId = threadIdMap.get(p.threadId)!;
        return prisma.email.upsert({
          where: { externalId: p.id },
          update: {
            from: p.from,
            to: p.to,
            subject: p.subject,
            body: p.body,
            bodyHtml: p.bodyHtml,
            isRead: p.isRead,
            sentAt: p.date,
          },
          create: {
            externalId: p.id,
            from: p.from,
            to: p.to,
            subject: p.subject,
            body: p.body,
            bodyHtml: p.bodyHtml,
            isRead: p.isRead,
            sentAt: p.date,
            threadId: dbThreadId,
            userId: user.id,
          },
        });
      });
    await batchAll(emailTasks);

    return NextResponse.json({
      success: true,
      synced: parsed.length,
      message: `Synced ${parsed.length} emails from Gmail`,
    });
  } catch (error) {
    console.error("Google sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
