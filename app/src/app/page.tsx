"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MailSidebar } from "@/components/mail/sidebar";
import { ThreadList } from "@/components/mail/thread-list";
import { ReadingPane } from "@/components/mail/reading-pane";
import { Sheet } from "@/components/ui/sheet";
import { mockThreads, EmailThread, toEmailThread, MailFolder } from "@/lib/mock-email";
import { ComposeMail, ReplyContext } from "@/components/mail/compose-mail";

export default function Home() {
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<MailFolder>("INBOX");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "reading">("list");
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyContext, setReplyContext] = useState<ReplyContext | null>(null);


  // Fetch threads from database
  const fetchThreads = useCallback(async () => {
    try {
      const response = await fetch(`/api/mail/threads?folder=${currentFolder}`);
      if (response.ok) {
        const data = await response.json();
        if (data.threads && data.threads.length > 0) {
          const uiThreads = data.threads.map(toEmailThread);
          setThreads(uiThreads);
          setIsConnected(true);
          return;
        }
      }
    } catch (error) {
      console.log("Using mock data:", error);
    }
    
    // Fallback to mock data
    const filtered = mockThreads.filter((t) => t.folder === currentFolder);
    setThreads(filtered);
    setIsConnected(false);
  }, [currentFolder]);

  useEffect(() => {
    setIsLoading(true);
    fetchThreads().finally(() => setIsLoading(false));
  }, [fetchThreads]);

  const handleSelectThread = (thread: EmailThread) => {
    setSelectedThread(thread);
    setMobileView("reading");
  };

  const handleBackToList = () => {
    setMobileView("list");
  };

  const handleFolderChange = (folder: MailFolder) => {
    setCurrentFolder(folder);
    setSelectedThread(null);
    setSidebarOpen(false);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // Try Google sync first, fallback to Aurinko
      let response = await fetch("/api/google/sync", { method: "POST" });
      
      // If no Google account, try Aurinko
      if (response.status === 404) {
        response = await fetch("/api/mail/sync", { method: "POST" });
      }
      
      const data = await response.json();
      if (response.ok) {
        if (data.synced > 0) {
          await fetchThreads();
          alert(`Successfully synced ${data.synced} emails!`);
        }
      } else {
        if (data.needsReauth) {
          if (confirm("Your session has expired. Would you like to reconnect?")) {
            handleConnect();
          }
        } else {
          console.error("Sync issue:", data.error);
        }
      }
    } catch (error) {
      console.error("Sync error:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnect = () => {
    // Use Google OAuth directly instead of Aurinko
    window.location.href = "/api/google/auth";
  };

  const handleSend = async (data: {
    to: string;
    subject: string;
    body: string;
    threadId?: string;
  }) => {
    const res = await fetch("/api/google/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Failed to send email");
    }
    alert("Email sent successfully!");
    // Refresh threads in the background (don't block)
    fetchThreads();
  };
  
  const handleReply = (thread: EmailThread) => {
    setReplyContext({
      to: thread.senderEmail || thread.sender,
      subject: thread.subject,
      body: thread.body,
      threadId: thread.externalThreadId || undefined,
    });
    setIsComposeOpen(true);
  };

  const handleSmartReply = (thread: EmailThread, replyBody: string) => {
    setReplyContext({
      to: thread.senderEmail || thread.sender,
      subject: thread.subject,
      body: replyBody, // AI-generated reply body
      threadId: thread.externalThreadId || undefined,
      isSmartReply: true,
    });
    setIsComposeOpen(true);
  };

  const handleCompose = () => {
    setReplyContext(null);
    setIsComposeOpen(true);
  };

  return (
    <main className="flex h-screen min-h-0 flex-col overflow-hidden">
      {/* Mobile Sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen} side="left">
        <MailSidebar 
          onClose={() => setSidebarOpen(false)} 
          currentFolder={currentFolder}
          onFolderChange={handleFolderChange}
          onSync={handleSync}
          isSyncing={isSyncing}
          isConnected={isConnected}
          onConnect={handleConnect}
          onCompose={handleCompose}
        />
      </Sheet>

      <header className="glass flex flex-shrink-0 items-center justify-between gap-2 border-b border-white/20 px-3 py-2 shadow-xl shadow-indigo-500/10 sm:gap-4 sm:px-4 sm:py-3">
        {/* Mobile menu button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:scale-105 hover:shadow-indigo-500/50 md:hidden"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2 text-sm font-semibold sm:gap-3">
          <span className="glow-pulse inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-sm font-bold text-white shadow-lg transition-transform duration-300 ease-out hover:scale-110 hover:rotate-12 sm:h-10 sm:w-10 sm:rounded-2xl sm:text-lg">
            ✨
          </span>
          <div className="hidden flex-col leading-tight xs:flex">
            <span className="gradient-text text-[10px] font-bold uppercase tracking-[0.2em] sm:text-xs">
              AI Workspace
            </span>
            <span className="text-xs text-slate-700 sm:text-sm">
              AI Mail <span className="bounce-soft ml-1 inline-block text-xs">📨</span>
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1 sm:max-w-xl">
          <Input
            placeholder="Search ✨"
            className="h-8 rounded-full border-2 border-indigo-200/50 bg-white/80 text-xs shadow-lg shadow-indigo-500/10 placeholder:text-indigo-300 transition-all duration-300 focus:border-indigo-400 focus:shadow-indigo-500/20 focus-visible:ring-indigo-500 sm:h-10"
          />
        </div>

        {/* Sync button - Desktop */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="hidden items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:scale-105 hover:shadow-emerald-500/50 disabled:opacity-50 sm:flex"
        >
          <svg className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isSyncing ? "Syncing..." : "Sync"}
        </button>

        <div className="hidden items-center gap-3 text-xs sm:flex">
          <div className="flex flex-col items-end">
            <span className="mb-1 text-[11px] text-indigo-400">
              {isConnected ? "Connected ✓" : "Demo Mode"} 👋
            </span>
            <div className="wobble-hover flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 text-sm text-white shadow-lg shadow-purple-500/40 transition-transform duration-300 hover:scale-110">
              😊
            </div>
          </div>
        </div>

        {/* Mobile avatar */}
        <div className="wobble-hover flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 text-sm text-white shadow-lg shadow-purple-500/40 sm:hidden">
          😊
        </div>
      </header>

      <section className="flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden flex-shrink-0 md:block md:w-56 lg:w-64 xl:w-72">
          <MailSidebar 
            currentFolder={currentFolder}
            onFolderChange={handleFolderChange}
            onSync={handleSync}
            isSyncing={isSyncing}
            isConnected={isConnected}
            onConnect={handleConnect}
            onCompose={handleCompose}
          />
        </div>

        {/* Mobile View: Thread List or Reading Pane */}
        <div className="flex min-h-0 flex-1 flex-col md:hidden">
          {mobileView === "list" ? (
            <ThreadList
              threads={threads}
              selectedId={selectedThread?.id}
              onSelectThread={handleSelectThread}
              isLoading={isLoading}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <button
                onClick={handleBackToList}
                className="glass flex items-center gap-2 border-b border-indigo-100 px-4 py-3 text-sm font-medium text-indigo-600 transition-all duration-300 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <svg className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                ← Back to Inbox
              </button>
              <div className="min-h-0 flex-1">
                <ReadingPane thread={selectedThread} onReply={handleReply} onSmartReply={handleSmartReply} />
              </div>
            </div>
          )}
        </div>

        {/* Desktop View: Thread List + Reading Pane */}
        <div className="hidden min-h-0 flex-1 md:flex">
          <div className="min-h-0 w-80 flex-shrink-0 lg:w-96 xl:w-[420px]">
            <ThreadList
              threads={threads}
              selectedId={selectedThread?.id}
              onSelectThread={handleSelectThread}
              isLoading={isLoading}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ReadingPane thread={selectedThread} onReply={handleReply} onSmartReply={handleSmartReply} />
          </div>
        </div>
      </section>
      <ComposeMail
        isOpen={isComposeOpen}
        onOpenChange={setIsComposeOpen}
        onSend={handleSend}
        replyTo={replyContext}
      />
    </main>
  );
}

