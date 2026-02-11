// GitHub Models - free AI via GitHub Student Pack
// Uses OpenAI-compatible endpoint with GitHub PAT

const GITHUB_MODELS_URL = "https://models.inference.ai.azure.com/chat/completions";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const MODEL = "gpt-4o-mini";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const res = await fetch(GITHUB_MODELS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GITHUB_TOKEN}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`AI request failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

export async function summarizeEmail(subject: string, body: string): Promise<string> {
  return chatCompletion([
    {
      role: "system",
      content: "You are an email assistant. Summarize emails in 2-3 concise sentences. Focus on key points, action items, and important details. Be direct and clear.",
    },
    {
      role: "user",
      content: `Summarize this email:\n\nSubject: ${subject}\n\nBody:\n${body}`,
    },
  ]);
}

export interface ReplySuggestion {
  label: string;
  tone: "positive" | "neutral" | "decline";
  body: string;
}

export async function generateReplySuggestions(
  subject: string,
  body: string,
  sender: string
): Promise<ReplySuggestion[]> {
  const text = await chatCompletion([
    {
      role: "system",
      content: `You are an email assistant. Generate exactly 3 short reply suggestions with different tones. Each reply should be 1-3 sentences max, professional and natural sounding.

Return ONLY a valid JSON array with exactly 3 objects. Each object must have:
- "label": a short 2-4 word button label (e.g., "Sounds great!", "Let me check", "Can't make it")
- "tone": one of "positive", "neutral", or "decline"
- "body": the actual reply text (1-3 sentences)

The first should be positive/agreeable, the second neutral/acknowledging, the third a polite decline or deferral. Return ONLY the JSON array, no markdown.`,
    },
    {
      role: "user",
      content: `Generate reply suggestions for this email:\n\nFrom: ${sender}\nSubject: ${subject}\n\n${body}`,
    },
  ]);

  // Extract JSON from the response (handle markdown code blocks)
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Try to find array in the text
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    jsonStr = arrayMatch[0];
  }

  try {
    const suggestions = JSON.parse(jsonStr) as ReplySuggestion[];
    // Validate structure
    return suggestions.slice(0, 3).map((s) => ({
      label: s.label || "Reply",
      tone: (["positive", "neutral", "decline"].includes(s.tone) ? s.tone : "neutral") as ReplySuggestion["tone"],
      body: s.body || "",
    }));
  } catch {
    // Fallback if parsing fails
    return [
      { label: "Thanks!", tone: "positive", body: "Thank you for your email. I appreciate you reaching out." },
      { label: "Got it", tone: "neutral", body: "Thanks for letting me know. I'll review this and get back to you." },
      { label: "Not now", tone: "decline", body: "Thank you for reaching out. Unfortunately, I'm unable to proceed with this at the moment." },
    ];
  }
}
