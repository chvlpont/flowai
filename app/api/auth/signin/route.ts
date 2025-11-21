import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { emailOrUsername, password } = await request.json();

  let emailToUse = emailOrUsername;

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

  // Check if input is an email or username
  if (!emailOrUsername.includes("@")) {
    // It's a username or display_name, fetch the email
    let { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("username", emailOrUsername)
      .single();

    if (!profile) {
      // Try display_name
      const { data: profile2 } = await supabase
        .from("profiles")
        .select("email")
        .eq("display_name", emailOrUsername)
        .single();
      profile = profile2;
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Username or display name not found" },
        { status: 400 }
      );
    }

    emailToUse = profile.email;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailToUse,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Get the session to return to client
  const { data: sessionData } = await supabase.auth.getSession();

  const response = NextResponse.json({
    success: true,
    session: sessionData.session,
  });

  // Set cookies from jar
  for (const [name, { value, options }] of Object.entries(cookieJar)) {
    response.cookies.set(name, value, options);
  }

  return response;
}
