import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/ui/sidebar";
import { MailFolder } from "@/lib/mock-email";

const FOLDERS: { id: MailFolder; label: string; icon: string }[] = [
  { id: "INBOX", label: "Inbox", icon: "📥" },
  { id: "SENT", label: "Sent", icon: "📤" },
  { id: "DRAFTS", label: "Drafts", icon: "📝" },
  { id: "TRASH", label: "Trash", icon: "🗑️" },
];

interface MailSidebarProps {
  onClose?: () => void;
  currentFolder?: MailFolder;
  onFolderChange?: (folder: MailFolder) => void;
  onSync?: () => void;
  isSyncing?: boolean;
  isConnected?: boolean;
  onConnect?: () => void;
  onCompose?: () => void;
}

export function MailSidebar({ 
  onClose,
  currentFolder = "INBOX",
  onFolderChange,
  onSync,
  isSyncing = false,
  isConnected = false,
  onConnect,
  onCompose,
}: MailSidebarProps) {
  return (
    <Sidebar className="glass w-full px-4 py-5 md:w-full">
      {onClose && (
        <div className="mb-4 flex items-center justify-between px-1 md:hidden">
          <span className="gradient-text text-sm font-bold">Menu</span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 transition-all duration-300 hover:scale-110"
            aria-label="Close menu"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      <div className="mb-6 px-1">
        <Button 
          onClick={onCompose}
          className="btn-glow card-float h-12 w-full justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 text-sm font-bold shadow-xl shadow-purple-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-purple-500/50"
        >
          ✨ Compose magic
        </Button>
      </div>

      {/* Connect / Sync buttons */}
      <div className="mb-6 space-y-2 px-1">
        {!isConnected ? (
          <button
            onClick={onConnect}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-500/50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Connect Gmail
          </button>
        ) : (
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-emerald-500/50 disabled:opacity-50"
          >
            <svg className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isSyncing ? "Syncing..." : "Sync Emails"}
          </button>
        )}
      </div>

      <div className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-400">
        Folders
      </div>
      <nav className="space-y-2 text-sm">
        {FOLDERS.map((folder, index) => {
          const isActive = currentFolder === folder.id;
          return (
            <button
              key={folder.id}
              onClick={() => onFolderChange?.(folder.id)}
              className={`stagger-${index + 1} fade-in-up flex w-full items-center justify-between rounded-xl px-4 py-3 text-left font-medium transition-all duration-300 ${
                isActive
                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30"
                  : "text-slate-600 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 hover:shadow-md hover:shadow-indigo-500/10"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{folder.icon}</span>
                <span>{folder.label}</span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* Connection status */}
      <div className="mt-6 px-1">
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${isConnected ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
          <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-amber-500"}`} />
          {isConnected ? "Connected to Gmail" : "Demo Mode"}
        </div>
      </div>
    </Sidebar>
  );
}

