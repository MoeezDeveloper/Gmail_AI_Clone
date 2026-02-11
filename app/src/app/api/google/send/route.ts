import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { refreshGoogleToken, sendGmail } from "@/lib/google";
import { auth } from "@/lib/auth";

async function getValidAccessToken(userId: string): Promise<{ token: string } | { error: string }> {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "google"
    },
  });

  if (!account) return { error: "No Google account found. Please authenticate via /api/google/auth" };

  // If token is not expired, return it
  // expires_at is Int (seconds)
  if (!account.expires_at || (Date.now() / 1000) <= account.expires_at) {
    if (!account.access_token) return { error: "Access token missing" };
    return { token: account.access_token };
  }

  // Token is expired - try to refresh
  if (!account.refresh_token) {
    return { error: "Token expired and no refresh token available. Please re-authenticate via /api/google/auth" };
  }

  try {
    const newTokens = await refreshGoogleToken(account.refresh_token);
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: newTokens.access_token,
        expires_at: Math.floor(Date.now() / 1000 + newTokens.expires_in),
      },
    });
    return { token: newTokens.access_token };
  } catch (error) {
    console.error("Token refresh failed:", error);
    return { error: `Token refresh failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await getValidAccessToken(session.user.id);
    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }
    const accessToken = result.token;

    const { to, subject, body, threadId, inReplyTo, references } = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, body" },
        { status: 400 }
      );
    }

    await sendGmail(accessToken, { to, subject, body, threadId, inReplyTo, references });

    return NextResponse.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Send API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 }
    );
  }
}
