export type MailFolder = "INBOX" | "SENT" | "DRAFTS" | "TRASH";

export interface EmailThread {
  id: string;
  subject: string;
  sender: string;
  senderEmail: string;
  externalThreadId?: string | null;
  preview: string;
  timestamp: string;
  folder: MailFolder;
  unread: boolean;
  body: string;
  bodyHtml?: string | null;
}

// Extract a readable sender name from Gmail "From" format like "Name <email@domain.com>"
function extractSenderName(from: string): string {
  if (!from) return "Unknown";
  // "John Doe <john@example.com>" → "John Doe"
  const match = from.match(/^"?([^"<]+)"?\s*</);
  if (match) return match[1].trim();
  // "john@example.com" → "john"
  const atIndex = from.indexOf("@");
  if (atIndex > 0) return from.substring(0, atIndex);
  return from || "Unknown";
}

// Extract email address from "Name <email@domain.com>" format
function extractEmail(from: string): string {
  if (!from) return "";
  const match = from.match(/<([^>]+)>/);
  if (match) return match[1];
  // Already a plain email
  if (from.includes("@")) return from.trim();
  return from;
}

// Convert database thread to UI thread format
export function toEmailThread(dbThread: {
  id: string;
  externalId?: string | null;
  subject: string;
  snippet: string;
  folder: MailFolder;
  lastMessageAt: Date;
  emails: {
    from: string;
    body: string;
    bodyHtml?: string | null;
    isRead: boolean;
    sentAt: Date;
  }[];
}): EmailThread {
  const latestEmail = dbThread.emails[0];
  const now = new Date();
  const msgDate = new Date(dbThread.lastMessageAt);
  
  // Format timestamp
  let timestamp: string;
  const diffDays = Math.floor((now.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    timestamp = msgDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } else if (diffDays === 1) {
    timestamp = "Yesterday";
  } else if (diffDays < 7) {
    timestamp = msgDate.toLocaleDateString("en-US", { weekday: "short" });
  } else {
    timestamp = msgDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return {
    id: dbThread.id,
    subject: dbThread.subject,
    sender: extractSenderName(latestEmail?.from || ""),
    senderEmail: extractEmail(latestEmail?.from || ""),
    externalThreadId: dbThread.externalId || null,
    preview: dbThread.snippet,
    timestamp,
    folder: dbThread.folder,
    unread: latestEmail ? !latestEmail.isRead : false,
    body: latestEmail?.body || "",
    bodyHtml: latestEmail?.bodyHtml,
  };
}

export const mockThreads: EmailThread[] = [
  {
    id: "1",
    subject: "Welcome to AI Mail",
    sender: "AI Team",
    senderEmail: "ai-team@aimail.com",
    externalThreadId: null,
    preview: "Thanks for trying this AI-powered Gmail clone...",
    timestamp: "9:24 AM",
    folder: "INBOX",
    unread: true,
    body:
      "Hi there,\n\nThanks for trying this AI-powered Gmail clone. " +
      "This is a fully static mock thread purely for UI exploration.\n\nBest,\nAI Team",
  },
  {
    id: "2",
    subject: "Your weekly product update",
    sender: "Product Updates",
    senderEmail: "updates@product.com",
    externalThreadId: null,
    preview: "Here’s what shipped this week across the platform...",
    timestamp: "Yesterday",
    folder: "INBOX",
    unread: false,
    body:
      "Hello,\n\nHere’s what shipped this week across the platform:\n" +
      "• Faster search\n• Better mobile layout\n• Smarter notifications\n\nCheers,\nProduct Team",
  },
  {
    id: "3",
    subject: "Draft: AI Gmail ideas",
    sender: "You",
    senderEmail: "you@aimail.com",
    externalThreadId: null,
    preview: "Brainstorming features like smart summaries and intent search...",
    timestamp: "Mon",
    folder: "DRAFTS",
    unread: false,
    body:
      "Working draft:\n\n- Smart thread summaries\n- Priority inbox powered by embeddings\n- Natural language search over all mail\n\nTo be refined.",
  },
  {
    id: "4",
    subject: "Invoice for February",
    sender: "Billing",
    senderEmail: "billing@service.com",
    externalThreadId: null,
    preview: "Your invoice for February is now available...",
    timestamp: "Feb 2",
    folder: "INBOX",
    unread: true,
    body:
      "Hi,\n\nYour invoice for February is now available in your account portal.\n\nThanks,\nBilling",
  },
  {
    id: "5",
    subject: "Delivery confirmation",
    sender: "Logistics",
    senderEmail: "logistics@shipping.com",
    externalThreadId: null,
    preview: "Your package has been delivered. We hope you enjoy it...",
    timestamp: "Jan 27",
    folder: "SENT",
    unread: false,
    body:
      "Hi,\n\nYour package has been delivered. We hope you enjoy it!\n\nBest,\nLogistics",
  },
];

