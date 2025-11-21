import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let cookieJar: Record<string, { value: string; options: any }> = {};

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieJar[name] = { value, options };
        },
        remove(name: string, options: any) {
          cookieJar[name] = { value: "", options };
        },
      },
    }
  );

  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });

  // Set cookies from jar (should clear them)
  for (const [name, { value, options }] of Object.entries(cookieJar)) {
    response.cookies.set(name, value, options);
  }

  return response;
}
