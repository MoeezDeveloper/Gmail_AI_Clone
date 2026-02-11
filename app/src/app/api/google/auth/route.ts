import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/google";

export async function GET() {
  try {
    const authUrl = getGoogleAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.redirect(
      new URL("/?error=auth_failed", process.env.NEXT_PUBLIC_URL || "http://localhost:3000")
    );
  }
}
