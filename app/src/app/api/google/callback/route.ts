import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeGoogleCode, getGoogleUserInfo } from "@/lib/google";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

  if (error) {
    console.error("Google auth error:", error);
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}`, baseUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?error=missing_code", baseUrl));
  }

  try {
    // Exchange code for tokens
    const tokenData = await exchangeGoogleCode(code);

    // Get user info from Google
    const userInfo = await getGoogleUserInfo(tokenData.access_token);

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

    // Upsert account with tokens (use "google" as provider)
    await prisma.account.upsert({
      where: { 
        provider_providerAccountId: {
          provider: "google",
          providerAccountId: userInfo.email,
        }
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || undefined,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      },
      create: {
        provider: "google",
        providerAccountId: userInfo.email,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        emailAddress: userInfo.email,
        userId: user.id,
      },
    });

    // Redirect back to app
    return NextResponse.redirect(new URL("/?connected=google", baseUrl));
  } catch (err) {
    console.error("Google callback error:", err);
    return NextResponse.redirect(new URL("/?error=auth_failed", baseUrl));
  }
}
