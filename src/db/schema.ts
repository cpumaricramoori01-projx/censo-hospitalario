// =====================================================================
// src/db/schema.ts
// Esquema de base de datos con Drizzle ORM (gratuito, sin servicios
// externos de pago). Reemplaza al schema.prisma anterior.
//
// Instalacion:
//   npm install drizzle-orm mysql2
//   npm install -D drizzle-kit
// =====================================================================
 
import {
  mysqlTable,
  varchar,
  char,
  date,
  datetime,
  int,
  text,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
 
// ---------------------------------------------------------------------
// Referencia de pacientes (manual por ahora, luego sincronizado del HIS)
// ---------------------------------------------------------------------
export const pacientesRef = mysqlTable("pacientes_ref", {
  hc: varchar("hc", { length: 20 }).primaryKey(),
  nombres: varchar("nombres", { length: 100 }).notNull(),
  apellidos: varchar("apellidos", { length: 100 }).notNull(),
  sexo: char("sexo", { length: 1 }),
  fechaNacimiento: date("fecha_nacimiento"),
  correo: varchar("correo", { length: 120 }),
  telefono: varchar("telefono", { length: 20 }),
  direccion: varchar("direccion", { length: 200 }),
  origenDato: varchar("origen_dato", { length: 20 }).notNull().default("manual"),
  fechaActualizacion: datetime("fecha_actualizacion").notNull(),
});
 
export const servicios = mysqlTable("servicios", {
  id: int("id").primaryKey().autoincrement(),
  nombre: varchar("nombre", { length: 50 }).notNull(), // Medicina, Cirugia, Pediatria, UCI
});
 
export const especialidades = mysqlTable("especialidades", {
  id: int("id").primaryKey().autoincrement(),
  nombre: varchar("nombre", { length: 80 }).notNull(),
  servicioId: int("servicio_id").notNull(),
});
 
export const camas = mysqlTable("camas", {
  id: int("id").primaryKey().autoincrement(),
  numero: varchar("numero", { length: 10 }).notNull(),
  estado: varchar("estado", { length: 20 }).notNull().default("libre"), // libre, ocupada, mantenimiento
  especialidadId: int("especialidad_id").notNull(),
});
 
export const ingresos = mysqlTable("ingresos", {
  id: int("id").primaryKey().autoincrement(),
  hc: varchar("hc", { length: 20 }).notNull(),
  camaId: int("cama_id").notNull(),
  fechaIngreso: datetime("fecha_ingreso").notNull(),
  diagnostico: varchar("diagnostico", { length: 200 }),
  medico: varchar("medico", { length: 100 }),
});
 
export const movimientos = mysqlTable("movimientos", {
  id: int("id").primaryKey().autoincrement(),
  ingresoId: int("ingreso_id").notNull(),
  camaOrigenId: int("cama_origen_id"),
  camaDestinoId: int("cama_destino_id"),
  fecha: datetime("fecha").notNull(),
});
 
export const egresos = mysqlTable("egresos", {
  id: int("id").primaryKey().autoincrement(),
  ingresoId: int("ingreso_id").notNull().unique(),
  fechaEgreso: datetime("fecha_egreso").notNull(),
  tipoEgreso: varchar("tipo_egreso", { length: 30 }).notNull(), // mejora, fallecido, transferencia, voluntario
  diagnosticoFinal: varchar("diagnostico_final", { length: 200 }),
});
 
// ---------------------------------------------------------------------
// Relaciones (para que Drizzle pueda hacer "with: {...}" en las queries,
// similar al include de Prisma)
// ---------------------------------------------------------------------
export const serviciosRelations = relations(servicios, ({ many }) => ({
  especialidades: many(especialidades),
}));
 
export const especialidadesRelations = relations(especialidades, ({ one, many }) => ({
  servicio: one(servicios, {
    fields: [especialidades.servicioId],
    references: [servicios.id],
  }),
  camas: many(camas),
}));
 
export const camasRelations = relations(camas, ({ one, many }) => ({
  especialidad: one(especialidades, {
    fields: [camas.especialidadId],
    references: [especialidades.id],
  }),
  ingresos: many(ingresos),
}));
 
export const ingresosRelations = relations(ingresos, ({ one, many }) => ({
  paciente: one(pacientesRef, {
    fields: [ingresos.hc],
    references: [pacientesRef.hc],
  }),
  cama: one(camas, {
    fields: [ingresos.camaId],
    references: [camas.id],
  }),
  movimientos: many(movimientos),
}));
 
export const movimientosRelations = relations(movimientos, ({ one }) => ({
  ingreso: one(ingresos, {
    fields: [movimientos.ingresoId],
    references: [ingresos.id],
  }),
}));
 
export const egresosRelations = relations(egresos, ({ one }) => ({
  ingreso: one(ingresos, {
    fields: [egresos.ingresoId],
    references: [ingresos.id],
  }),
}));
