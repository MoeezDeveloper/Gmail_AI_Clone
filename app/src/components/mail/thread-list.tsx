import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { EmailThread } from "@/lib/mock-email";

interface ThreadListProps {
  threads: EmailThread[];
  selectedId?: string;
  onSelectThread?: (thread: EmailThread) => void;
  isLoading?: boolean;
}

export function ThreadList({ threads, selectedId, onSelectThread, isLoading = false }: ThreadListProps) {
  return (
    <Card className="card-float glass flex h-full flex-col rounded-none border-0 border-r border-indigo-100/50 md:rounded-2xl md:border">
      <CardContent className="flex h-full flex-col gap-0 p-0">
        <div className="flex items-center justify-between border-b border-indigo-100/50 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 px-4 py-3 text-[11px] uppercase tracking-[0.18em]">
          <span className="flex items-center gap-2">
            <span className="bounce-soft text-sm">⭐</span>
            <span className="gradient-text font-bold">Primary</span>
          </span>
          <span className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1 text-[10px] font-bold text-white shadow-sm">
            {threads.length} conversations
          </span>
        </div>
        <ScrollArea className="flex-1">
          <div className="divide-y divide-indigo-50">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 px-4 py-4"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="mt-2 h-2.5 w-2.5 flex-shrink-0 animate-pulse rounded-full bg-slate-200" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                      <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
                    </div>
                    <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-64 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))
            ) : (
              <>
                {threads.map((thread, index) => {
                  const isSelected = thread.id === selectedId;
                  return (
                    <div
                      key={thread.id}
                      onClick={() => onSelectThread?.(thread)}
                      style={{ animationDelay: `${index * 50}ms` }}
                      className={`thread-row fade-in-up flex cursor-pointer items-start gap-3 px-4 py-4 text-sm ${
                        isSelected
                          ? "bg-gradient-to-r from-indigo-50 to-purple-50 shadow-inner"
                          : thread.unread
                            ? "bg-white/90"
                            : "bg-slate-50/40"
                      }`}
                    >
                      <div
                        className={`mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                          thread.unread ? "unread-dot" : "bg-slate-300"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`truncate text-[13px] font-bold ${isSelected ? "gradient-text" : "text-slate-800"}`}>
                            {thread.sender}
                          </p>
                          <span className="flex-shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-500">
                            {thread.timestamp}
                          </span>
                        </div>
                        <p className={`truncate text-sm font-semibold ${isSelected ? "text-indigo-700" : "text-slate-700"}`}>
                          {thread.subject}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {thread.preview}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {threads.length === 0 && (
                  <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm">
                    <span className="text-3xl">📭</span>
                    <span className="text-slate-400">No conversations yet</span>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
        <Separator className="bg-indigo-100/50" />
        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50/30 to-purple-50/30 px-4 py-3 text-[11px] text-slate-500">
          <span className="font-medium">
            1–{threads.length} of {threads.length}
          </span>
          <button className="flex items-center gap-1 rounded-full bg-white px-3 py-1 font-medium text-indigo-500 shadow-sm transition-all duration-300 hover:bg-indigo-50 hover:shadow-md">
            Older <span className="text-xs">→</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

