import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// MySQL trabaja en UTC. Las pantallas y cortes de reportes usan America/Lima.
const poolConnection = mysql.createPool({
  uri: process.env.DATABASE_URL,
  timezone: "Z",
  ssl:
    process.env.DATABASE_SSL === "false"
      ? undefined
      : {
          rejectUnauthorized: true,
          ...(process.env.DATABASE_CA
            ? { ca: process.env.DATABASE_CA.replace(/\\n/g, "\n") }
            : {}),
        },
  connectionLimit: 5,
});
export const db = drizzle(poolConnection, { schema, mode: "default" });
