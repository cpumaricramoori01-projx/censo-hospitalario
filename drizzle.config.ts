// =====================================================================
// drizzle.config.ts (raiz del proyecto)
// Configuracion de drizzle-kit para generar y correr migraciones.
// =====================================================================

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
