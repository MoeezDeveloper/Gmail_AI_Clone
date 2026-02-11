import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EmailThread } from "@/lib/mock-email";

interface ReplySuggestion {
  label: string;
  tone: "positive" | "neutral" | "decline";
  body: string;
}

interface ReadingPaneProps {
  thread: EmailThread | null;
  onReply?: (thread: EmailThread) => void;
  onSmartReply?: (thread: EmailThread, replyBody: string) => void;
}

export function ReadingPane({ thread, onReply, onSmartReply }: ReadingPaneProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<ReplySuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  // Track which thread the current AI data belongs to
  const [aiThreadId, setAiThreadId] = useState<string | null>(null);

  // Reset AI state when thread changes
  if (thread && thread.id !== aiThreadId) {
    setSummary(null);
    setSummaryError(null);
    setSuggestions([]);
    setSuggestionsError(null);
    setIsSummarizing(false);
    setIsLoadingSuggestions(false);
    setAiThreadId(thread.id);
  }

  const handleSummarize = async () => {
    if (!thread) return;
    setIsSummarizing(true);
    setSummaryError(null);
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: thread.subject, body: thread.body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to summarize");
      setSummary(data.summary);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Failed to summarize");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleGetSuggestions = async () => {
    if (!thread) return;
    setIsLoadingSuggestions(true);
    setSuggestionsError(null);
    try {
      const res = await fetch("/api/ai/reply-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: thread.subject,
          body: thread.body,
          sender: thread.sender,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate suggestions");
      setSuggestions(data.suggestions);
    } catch (err) {
      setSuggestionsError(err instanceof Error ? err.message : "Failed to generate suggestions");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const toneColors: Record<string, string> = {
    positive: "from-emerald-500 to-teal-500 shadow-emerald-500/30 hover:shadow-emerald-500/50",
    neutral: "from-blue-500 to-indigo-500 shadow-blue-500/30 hover:shadow-blue-500/50",
    decline: "from-amber-500 to-orange-500 shadow-amber-500/30 hover:shadow-amber-500/50",
  };

  const toneEmoji: Record<string, string> = {
    positive: "👍",
    neutral: "💬",
    decline: "🙅",
  };

  if (!thread) {
    return (
      <Card className="card-float glass flex h-full items-center justify-center rounded-none border-0 md:rounded-2xl md:border md:border-dashed md:border-indigo-200/50">
        <CardContent className="scale-in text-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="bounce-soft text-5xl">📭</span>
            <div className="space-y-2">
              <p className="gradient-text text-lg font-bold">
                Your reading pane is ready
              </p>
              <p className="text-sm text-slate-400">
                Select a conversation to preview it here ✨
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-float glass slide-in-right flex h-full flex-col overflow-hidden rounded-none border-0 md:rounded-2xl md:border md:border-indigo-100/50">
      <CardHeader className="flex-shrink-0 space-y-3 border-b border-indigo-100/50 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 pb-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="glow-pulse flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-lg text-white shadow-lg">
              {thread.sender.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-slate-800">{thread.sender}</p>
              <p className="text-[11px] text-slate-400">to me</p>
            </div>
          </div>
          <span className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1 text-[11px] font-medium text-white shadow-sm">
            {thread.timestamp} · Focused ✨
          </span>
        </div>
        <CardTitle className="gradient-text text-xl font-bold">
          {thread.subject} <span className="wobble-hover ml-1 inline-block align-middle text-lg">📧</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto bg-gradient-to-b from-white to-indigo-50/30 pt-6">
        {/* AI Summary Section */}
        <div className="mb-4">
          {!summary && !isSummarizing && !summaryError && (
            <button
              onClick={handleSummarize}
              className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 px-4 py-3 text-sm font-medium text-purple-700 transition-all duration-300 hover:border-purple-300 hover:from-purple-100 hover:to-indigo-100 hover:shadow-lg"
            >
              <span className="text-lg">🤖</span>
              <span>AI Summarize</span>
              <span className="ml-auto text-xs text-purple-400">Powered by Gemini</span>
            </button>
          )}
          {isSummarizing && (
            <div className="flex items-center gap-3 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 px-4 py-3">
              <div className="flex gap-1">
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-purple-500" style={{ animationDelay: "0ms" }} />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-indigo-500" style={{ animationDelay: "150ms" }} />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-pink-500" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-sm font-medium text-purple-700">AI is reading...</span>
            </div>
          )}
          {summary && (
            <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50/80 to-indigo-50/80 p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🤖</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600">AI Summary</span>
                </div>
                <button
                  onClick={() => setSummary(null)}
                  className="rounded-lg px-2 py-1 text-xs text-purple-400 transition-colors hover:bg-purple-100 hover:text-purple-600"
                >
                  ✕ Hide
                </button>
              </div>
              <p className="text-sm leading-relaxed text-slate-700">{summary}</p>
            </div>
          )}
          {summaryError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <span className="text-sm text-red-500">⚠️ {summaryError}</span>
              <button
                onClick={handleSummarize}
                className="ml-auto text-xs font-medium text-red-600 underline hover:text-red-800"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Email Body */}
        <div className="fade-in-up whitespace-pre-wrap rounded-2xl bg-white/80 p-6 text-sm leading-relaxed text-slate-700 shadow-lg shadow-indigo-500/5">
          {thread.body}
        </div>

        {/* AI Reply Suggestions */}
        <div className="mt-4">
          {suggestions.length === 0 && !isLoadingSuggestions && !suggestionsError && (
            <button
              onClick={handleGetSuggestions}
              className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-3 text-sm font-medium text-indigo-700 transition-all duration-300 hover:border-indigo-300 hover:from-indigo-100 hover:to-blue-100 hover:shadow-lg"
            >
              <span className="text-lg">💡</span>
              <span>AI Smart Reply</span>
              <span className="ml-auto text-xs text-indigo-400">3 suggestions</span>
            </button>
          )}
          {isLoadingSuggestions && (
            <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-3">
              <div className="flex gap-1">
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-indigo-500" style={{ animationDelay: "0ms" }} />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-blue-500" style={{ animationDelay: "150ms" }} />
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-purple-500" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-sm font-medium text-indigo-700">Generating smart replies...</span>
            </div>
          )}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">💡</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Smart Replies</span>
                </div>
                <button
                  onClick={() => setSuggestions([])}
                  className="rounded-lg px-2 py-1 text-xs text-indigo-400 transition-colors hover:bg-indigo-100 hover:text-indigo-600"
                >
                  ✕ Hide
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => onSmartReply?.(thread, s.body)}
                    className={`group rounded-xl bg-gradient-to-r ${toneColors[s.tone] || toneColors.neutral} px-4 py-3 text-left text-white shadow-lg transition-all duration-300 hover:scale-[1.02]`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold opacity-90">
                      <span>{toneEmoji[s.tone]}</span>
                      <span>{s.label}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug opacity-80 line-clamp-2">
                      {s.body}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
          {suggestionsError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <span className="text-sm text-red-500">⚠️ {suggestionsError}</span>
              <button
                onClick={handleGetSuggestions}
                className="ml-auto text-xs font-medium text-red-600 underline hover:text-red-800"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <button 
            onClick={() => onReply?.(thread)}
            className="btn-glow flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-indigo-500/50"
          >
            ↩️ Reply
          </button>
          <button className="flex-1 rounded-xl border-2 border-indigo-200 bg-white px-4 py-3 text-sm font-bold text-indigo-600 transition-all duration-300 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-lg">
            ↪️ Forward
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

