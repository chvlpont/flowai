import { updateSession } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/boards/:path*", "/board/:path*"],
};
