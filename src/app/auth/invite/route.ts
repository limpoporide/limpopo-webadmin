import { NextRequest, NextResponse } from "next/server";

function normalizeOrigin(value: string) {
  return value.replace(/\/+$/, "");
}

function resolveAppOrigin(request: NextRequest) {
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL;

  if (explicit) {
    return normalizeOrigin(explicit);
  }

  if (process.env.VERCEL_URL) {
    return normalizeOrigin(`https://${process.env.VERCEL_URL}`);
  }

  return normalizeOrigin(request.nextUrl.origin);
}

function resolveSupabaseOrigin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  return normalizeOrigin(supabaseUrl);
}

export async function GET(request: NextRequest) {
  const supabaseOrigin = resolveSupabaseOrigin();

  if (!supabaseOrigin) {
    return NextResponse.json(
      { error: "Supabase URL is not configured." },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();
  const type = url.searchParams.get("type")?.trim();

  if (!token || !(type === "invite" || type === "recovery")) {
    return NextResponse.json(
      { error: "Invalid invite link." },
      { status: 400 },
    );
  }

  const appOrigin = resolveAppOrigin(request);
  const redirectTo = `${appOrigin}/auth/accept-invite`;
  const verifyUrl = `${supabaseOrigin}/auth/v1/verify?token=${encodeURIComponent(
    token,
  )}&type=${encodeURIComponent(type)}&redirect_to=${encodeURIComponent(redirectTo)}`;

  return NextResponse.redirect(verifyUrl);
}

