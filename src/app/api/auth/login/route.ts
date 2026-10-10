import { jsonObject } from "@/lib/validation";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  COOKIE,
  signSession,
  verifyPassword,
  SESSION_SECONDS,
} from "@/lib/session";
import { sameOrigin } from "@/lib/auth";
import { fallo, HttpError, texto } from "@/lib/validation";
export async function POST(request: Request) {
  try {
    await sameOrigin();
    let users;
    try {
      users = accounts();
    } catch {
      return NextResponse.json(
        {
          error:
            "El acceso aún no está configurado. Contacta al administrador.",
        },
        { status: 503 },
      );
    }
    const b = await jsonObject(request);
    const usuario = texto(b.usuario, "Usuario", 64);
    const password = b.password;
    if (
      typeof password !== "string" ||
      password.length < 1 ||
      password.length > 256
    )
      throw new HttpError("Contraseña inválida");
    const key = createHash("sha256")
      .update(usuario.toLowerCase())
      .digest("hex");
    // Contador compartido por todas las instancias, ventana de quince minutos.
    const permitido = await db.transaction(async (tx) => {
      await tx.execute(
        sql`INSERT INTO intentos_acceso (clave,intentos,ventana) VALUES (${key},1,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE intentos=IF(ventana < UTC_TIMESTAMP() - INTERVAL 15 MINUTE,1,intentos+1), ventana=IF(ventana < UTC_TIMESTAMP() - INTERVAL 15 MINUTE,UTC_TIMESTAMP(),ventana)`,
      );
      const [rows] = await tx.execute(
        sql`SELECT intentos FROM intentos_acceso WHERE clave=${key} FOR UPDATE`,
      );
      return (rows as unknown as { intentos: number }[])[0].intentos <= 5;
    });
    if (!permitido)
      throw new HttpError(
        "Demasiados intentos. Vuelve a intentarlo en quince minutos.",
        429,
      );
    const account = users.find((a) => a.usuario === usuario);
    // Coste de verificación equivalente para usuarios desconocidos.
    const valid = verifyPassword(
      password,
      account?.passwordHash ?? users[0].passwordHash,
    );
    if (!account || !valid)
      throw new HttpError("Usuario o contraseña incorrectos", 401);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE, signSession(account), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (e) {
    return fallo(e);
  }
}
