import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fallo } from "@/lib/validation";
export async function GET() {
  try {
    return NextResponse.json(await requireUser(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return fallo(e);
  }
}
