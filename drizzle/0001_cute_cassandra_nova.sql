CREATE TABLE `diagnosticos_ingreso` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ingreso_id` int NOT NULL,
	`orden` int NOT NULL DEFAULT 1,
	`cie10_codigo` varchar(15),
	`cie10_descripcion` varchar(250) NOT NULL,
	CONSTRAINT `diagnosticos_ingreso_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `egresos` MODIFY COLUMN `diagnostico_final` varchar(250);--> statement-breakpoint
ALTER TABLE `servicios` MODIFY COLUMN `nombre` varchar(60) NOT NULL;--> statement-breakpoint
ALTER TABLE `camas` ADD `ubicacion` varchar(80);--> statement-breakpoint
ALTER TABLE `egresos` ADD `codigo_egreso_original` varchar(10);--> statement-breakpoint
ALTER TABLE `egresos` ADD `servicio_destino_id` int;--> statement-breakpoint
ALTER TABLE `egresos` ADD `medico_alta` varchar(100);--> statement-breakpoint
ALTER TABLE `ingresos` ADD `tipo_ingreso` varchar(20) DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `ingresos` ADD `servicio_origen_id` int;--> statement-breakpoint
ALTER TABLE `ingresos` ADD `financiamiento` varchar(40);--> statement-breakpoint
ALTER TABLE `ingresos` ADD `usa_ventilador` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `ingresos` ADD `usa_oxigeno` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `ingresos` ADD `tiene_problema_judicial` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `ingresos` ADD `tiene_problema_social` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `ingresos` ADD `notas_estancia` text;--> statement-breakpoint
ALTER TABLE `pacientes_ref` ADD `dni` varchar(15);--> statement-breakpoint
ALTER TABLE `pacientes_ref` ADD `apellido_paterno` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `pacientes_ref` ADD `apellido_materno` varchar(100);--> statement-breakpoint
ALTER TABLE `ingresos` DROP COLUMN `diagnostico`;--> statement-breakpoint
ALTER TABLE `pacientes_ref` DROP COLUMN `apellidos`;