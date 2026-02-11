import { NextResponse } from "next/server";
import { summarizeEmail } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const { subject, body } = await req.json();

    if (!body) {
      return NextResponse.json(
        { error: "Missing required field: body" },
        { status: 400 }
      );
    }

    const summary = await summarizeEmail(subject || "(No subject)", body);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Summarize API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to summarize email" },
      { status: 500 }
    );
  }
}
