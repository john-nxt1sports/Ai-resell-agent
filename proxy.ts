import { type NextRequest } from "next/server";
import { updateSession } from "@/services/supabase/middleware";
import { getSecurityHeaders } from "@/services/security/headers";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  const securityHeaders = getSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|auth|api).*)",
  ],
};
