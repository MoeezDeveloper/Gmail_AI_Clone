import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Folder } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderParam = searchParams.get("folder");
    
    // Validate folder
    const validFolders: Folder[] = ["INBOX", "SENT", "DRAFTS", "TRASH"];
    const folder = validFolders.includes(folderParam as Folder) 
      ? (folderParam as Folder) 
      : undefined;

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

    return NextResponse.json({
      threads: threads.map((thread) => ({
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
      })),
    });
  } catch (error) {
    console.error("Error fetching threads:", error);
    return NextResponse.json({ threads: [] }, { status: 200 });
  }
}
