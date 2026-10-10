import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/auth";
import { COOKIE } from "@/lib/session";
import { fallo } from "@/lib/validation";
export async function POST() {
  try {
    await sameOrigin();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (e) {
    return fallo(e);
  }
}
