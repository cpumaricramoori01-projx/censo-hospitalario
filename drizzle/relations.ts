import { relations } from "drizzle-orm/relations";
import { especialidades, camas, ingresos, diagnosticosIngreso, egresos, servicios, medicos, pacientesRef } from "./schema";

export const camasRelations = relations(camas, ({one, many}) => ({
	especialidade: one(especialidades, {
		fields: [camas.especialidadId],
		references: [especialidades.id]
	}),
	ingresos: many(ingresos),
}));

export const especialidadesRelations = relations(especialidades, ({one, many}) => ({
	camas: many(camas),
	servicio: one(servicios, {
		fields: [especialidades.servicioId],
		references: [servicios.id]
	}),
}));

export const diagnosticosIngresoRelations = relations(diagnosticosIngreso, ({one}) => ({
	ingreso: one(ingresos, {
		fields: [diagnosticosIngreso.ingresoId],
		references: [ingresos.id]
	}),
}));

export const ingresosRelations = relations(ingresos, ({one, many}) => ({
	diagnosticosIngresos: many(diagnosticosIngreso),
	egresos: many(egresos),
	cama: one(camas, {
		fields: [ingresos.camaId],
		references: [camas.id]
	}),
	medico: one(medicos, {
		fields: [ingresos.medicoId],
		references: [medicos.id]
	}),
	pacientesRef: one(pacientesRef, {
		fields: [ingresos.hc],
		references: [pacientesRef.hc]
	}),
	servicio: one(servicios, {
		fields: [ingresos.servicioOrigenId],
		references: [servicios.id]
	}),
}));

export const egresosRelations = relations(egresos, ({one}) => ({
	ingreso: one(ingresos, {
		fields: [egresos.ingresoId],
		references: [ingresos.id]
	}),
	servicio: one(servicios, {
		fields: [egresos.servicioDestinoId],
		references: [servicios.id]
	}),
}));

export const serviciosRelations = relations(servicios, ({many}) => ({
	egresos: many(egresos),
	especialidades: many(especialidades),
	ingresos: many(ingresos),
}));

export const medicosRelations = relations(medicos, ({many}) => ({
	ingresos: many(ingresos),
}));

export const pacientesRefRelations = relations(pacientesRef, ({many}) => ({
	ingresos: many(ingresos),
}));