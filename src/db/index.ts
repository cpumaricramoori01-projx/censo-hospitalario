// =====================================================================
// src/db/index.ts
// Cliente de conexion a MySQL usando mysql2 + Drizzle.
// Sin dependencias externas de pago: funciona igual en Vercel (pruebas)
// que autohospedado en la workstation (produccion).
// =====================================================================
 
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";
 
// Pool de conexiones: reutiliza conexiones en vez de abrir una nueva
// por cada request. connectionLimit bajo (5) es suficiente para
// pruebas; en produccion self-hosted puedes subirlo si hace falta.
const poolConnection = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 5,
});
 
export const db = drizzle(poolConnection, { schema, mode: "default" });
 
