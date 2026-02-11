import { NextResponse } from "next/server";
import { getAurinkoAuthUrl } from "@/lib/aurinko";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const returnUrl = searchParams.get("returnUrl") || "/";

  const authUrl = getAurinkoAuthUrl(returnUrl);

  return NextResponse.redirect(authUrl);
}
