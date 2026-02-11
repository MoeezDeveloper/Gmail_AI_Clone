"use server";

import { prisma } from "@/lib/prisma";
import { Folder } from "@prisma/client";

export interface ThreadWithEmails {
  id: string;
  externalId: string | null;
  subject: string;
  snippet: string;
  folder: Folder;
  lastMessageAt: Date;
  emails: {
    id: string;
    from: string;
    to: string;
    subject: string;
    body: string;
    bodyHtml: string | null;
    isRead: boolean;
    sentAt: Date;
  }[];
}

/**
 * Fetch threads from database with optional folder filter
 */
export async function getThreads(
  folder?: Folder
): Promise<ThreadWithEmails[]> {
  const threads = await prisma.thread.findMany({
    where: folder ? { folder } : undefined,
    include: {
      emails: {
        orderBy: { sentAt: "desc" },
        take: 1,
      },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });

  return threads.map((thread) => ({
    id: thread.id,
    externalId: thread.externalId,
    subject: thread.subject,
    snippet: thread.snippet,
    folder: thread.folder,
    lastMessageAt: thread.lastMessageAt,
    emails: thread.emails.map((email) => ({
      id: email.id,
      from: email.from,
      to: email.to,
      subject: email.subject,
      body: email.body,
      bodyHtml: email.bodyHtml,
      isRead: email.isRead,
      sentAt: email.sentAt,
    })),
  }));
}

/**
 * Fetch a single thread with all its emails
 */
export async function getThread(
  threadId: string
): Promise<ThreadWithEmails | null> {
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: {
      emails: {
        orderBy: { sentAt: "asc" },
      },
    },
  });

  if (!thread) return null;

  return {
    id: thread.id,
    externalId: thread.externalId,
    subject: thread.subject,
    snippet: thread.snippet,
    folder: thread.folder,
    lastMessageAt: thread.lastMessageAt,
    emails: thread.emails.map((email) => ({
      id: email.id,
      from: email.from,
      to: email.to,
      subject: email.subject,
      body: email.body,
      bodyHtml: email.bodyHtml,
      isRead: email.isRead,
      sentAt: email.sentAt,
    })),
  };
}

/**
 * Check if user has connected an email account
 */
export async function hasConnectedAccount(): Promise<boolean> {
  const count = await prisma.account.count();
  return count > 0;
}

/**
 * Mark a thread's emails as read
 */
export async function markThreadAsRead(threadId: string): Promise<void> {
  await prisma.email.updateMany({
    where: { threadId },
    data: { isRead: true },
  });
}

/**
 * Get folder counts
 */
export async function getFolderCounts(): Promise<Record<Folder, number>> {
  const counts = await prisma.thread.groupBy({
    by: ["folder"],
    _count: true,
  });

  const result: Record<Folder, number> = {
    INBOX: 0,
    SENT: 0,
    DRAFTS: 0,
    TRASH: 0,
  };

  for (const item of counts) {
    result[item.folder] = item._count;
  }

  return result;
}
