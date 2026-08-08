// =====================================================================
// src/db/index.ts
// Cliente de conexion a MySQL usando mysql2 + Drizzle.
// SSL configurado explicitamente (Aiven lo exige) en vez de depender
// del parametro "ssl-mode" en la URL, que mysql2 no reconoce y solo
// genera un warning (dejandolo asi podria fallar en versiones futuras).
// =====================================================================
 
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";
 
// Pool de conexiones: reutiliza conexiones en vez de abrir una nueva
// por cada request. connectionLimit bajo (5) es suficiente para
// pruebas; en produccion self-hosted puedes subirlo si hace falta.
const poolConnection = mysql.createPool({
  uri: process.env.DATABASE_URL,
  ssl: {
    // Aiven usa un certificado valido pero de una CA que Node no
    // reconoce por defecto en este modo simple. Para pruebas basta con
    // esto; en produccion self-hosted, si conectas a tu propio MySQL
    // local, probablemente no necesites SSL en absoluto (quita este
    // bloque completo si tu MySQL de produccion no lo exige).
    rejectUnauthorized: false,
  },
  connectionLimit: 5,
});
 
export const db = drizzle(poolConnection, { schema, mode: "default" });
 
