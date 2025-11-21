import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { email, password, username } = await request.json();

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

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError || !signUpData.user) {
    return NextResponse.json(
      { error: signUpError?.message || "Failed to create account" },
      { status: 400 }
    );
  }

  // Insert profile
  const { error: profileError } = await supabase.from("profiles").insert({
    id: signUpData.user.id,
    username,
    email: signUpData.user.email,
    display_name: username,
    created_at: new Date().toISOString(),
  });

  if (profileError) {
    return NextResponse.json(
      { error: "Account created but failed to set username" },
      { status: 400 }
    );
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
