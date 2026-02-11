import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { refreshGoogleToken, sendGmail } from "@/lib/google";

async function getValidAccessToken(): Promise<{ token: string } | { error: string }> {
  const account = await prisma.account.findFirst({
    where: { provider: "google" },
  });

  if (!account) return { error: "No Google account found. Please authenticate via /api/google/auth" };

  // If token is not expired, return it
  if (!account.expiresAt || new Date() <= account.expiresAt) {
    return { token: account.accessToken! };
  }

  // Token is expired - try to refresh
  if (!account.refreshToken) {
    return { error: "Token expired and no refresh token available. Please re-authenticate via /api/google/auth" };
  }

  try {
    const newTokens = await refreshGoogleToken(account.refreshToken);
    await prisma.account.update({
      where: { id: account.id },
      data: {
        accessToken: newTokens.access_token,
        expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
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
    const result = await getValidAccessToken();
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
