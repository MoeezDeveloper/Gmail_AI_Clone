import { NextResponse } from "next/server";
import { generateReplySuggestions } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const { subject, body, sender } = await req.json();

    if (!body) {
      return NextResponse.json(
        { error: "Missing required field: body" },
        { status: 400 }
      );
    }

    const suggestions = await generateReplySuggestions(
      subject || "(No subject)",
      body,
      sender || "Unknown"
    );

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Reply suggestions API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
