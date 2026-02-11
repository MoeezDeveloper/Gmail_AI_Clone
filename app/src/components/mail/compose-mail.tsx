"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface ReplyContext {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
  isSmartReply?: boolean;
}

interface ComposeMailProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSend: (data: {
    to: string;
    subject: string;
    body: string;
    threadId?: string;
  }) => void;
  replyTo?: ReplyContext | null;
}

export function ComposeMail({
  isOpen,
  onOpenChange,
  onSend,
  replyTo,
}: ComposeMailProps) {
  const [to, setTo] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [sendError, setSendError] = React.useState<string | null>(null);

  // Reset form whenever dialog opens or replyTo changes
  React.useEffect(() => {
    if (!isOpen) return; // Only set fields when opening
    setSendError(null);
    if (replyTo) {
      setTo(replyTo.to);
      const replySubject = replyTo.subject.startsWith("Re: ")
        ? replyTo.subject
        : `Re: ${replyTo.subject}`;
      setSubject(replySubject);

      if (replyTo.isSmartReply) {
        // Smart reply: AI body goes directly, no quoting
        setBody(replyTo.body);
      } else {
        const quotedBody = `\n\n\n--- ${replyTo.to} wrote: ---\n> ${replyTo.body.replace(/\n/g, "\n> ")}`;
        setBody(quotedBody);
      }
    } else {
      setTo("");
      setSubject("");
      setBody("");
    }
  }, [replyTo, isOpen]);

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      setSendError("Please fill in all fields (To, Subject, Body).");
      return;
    }
    setSendError(null);
    setIsSending(true);
    try {
      await onSend({
        to,
        subject,
        body,
        threadId: replyTo?.threadId,
      });
      // Reset form after successful send
      setTo("");
      setSubject("");
      setBody("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to send email", error);
      setSendError(error instanceof Error ? error.message : "Failed to send email");
      // Don't close dialog on error — let user retry
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
          aria-label="Close"
        >
          ✕
        </button>
        <DialogHeader>
          <DialogTitle>{replyTo ? "Reply" : "Compose"}</DialogTitle>
          <DialogDescription>
            {replyTo ? `Replying to ${replyTo.subject}` : "Draft a new message."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Input
              id="to"
              placeholder="To"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="col-span-4"
              disabled={!!replyTo}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Input
              id="subject"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="col-span-4"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Textarea
              id="body"
              placeholder="Message"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="col-span-4 min-h-[200px]"
            />
          </div>
        </div>
        <DialogFooter>
          {sendError && (
            <p className="mr-auto text-sm text-red-500">{sendError}</p>
          )}
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
