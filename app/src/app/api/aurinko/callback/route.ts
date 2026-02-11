import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForToken, getAurinkoUserInfo } from "@/lib/aurinko";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    console.error("Aurinko auth error:", error);
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/?error=missing_code", request.url)
    );
  }

  try {
    // Exchange code for tokens
    const tokenData = await exchangeCodeForToken(code);

    // Get user info from Aurinko
    const userInfo = await getAurinkoUserInfo(tokenData.accessToken);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: userInfo.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userInfo.email,
          name: userInfo.name,
        },
      });
    }

    // Upsert account with tokens
    await prisma.account.upsert({
      where: { providerAccountId: tokenData.accountId },
      update: {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresIn
          ? new Date(Date.now() + tokenData.expiresIn * 1000)
          : null,
      },
      create: {
        provider: "aurinko",
        providerAccountId: tokenData.accountId,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresIn
          ? new Date(Date.now() + tokenData.expiresIn * 1000)
          : null,
        emailAddress: userInfo.email,
        userId: user.id,
      },
    });

    // Redirect back to app
    const returnUrl = state ? decodeURIComponent(state) : "/";
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

    return NextResponse.redirect(new URL(returnUrl, baseUrl));
  } catch (err) {
    console.error("Aurinko callback error:", err);
    return NextResponse.redirect(
      new URL("/?error=auth_failed", request.url)
    );
  }
}
