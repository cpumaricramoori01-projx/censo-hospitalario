import { NextRequest, NextResponse } from "next/server";
import { COOKIE } from "@/lib/session";
import { sessionAccount } from "@/lib/accounts";
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/" || path === "/login" || path.startsWith("/api/auth/"))
    return NextResponse.next();
  const user = await sessionAccount(request.cookies.get(COOKIE)?.value);
  if (!user) {
    if (path.startsWith("/api/"))
      return NextResponse.json(
        { error: "Inicia sesión para continuar" },
        { status: 401 },
      );
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (
    (path === "/estructura" || path === "/test" || path === "/usuarios") &&
    user.rol !== "administrador"
  )
    return NextResponse.redirect(new URL("/panel", request.url));
  if (
    user.rol === "consulta" &&
    (path.startsWith("/ingresos/") || path.startsWith("/egresos/"))
  )
    return NextResponse.redirect(new URL("/censo", request.url));
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|brand/).*)"],
};
