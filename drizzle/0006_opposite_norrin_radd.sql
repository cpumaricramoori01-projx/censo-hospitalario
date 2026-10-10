CREATE TABLE `auditoria_sistema` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entidad` varchar(30) NOT NULL,
	`referencia` varchar(64) NOT NULL,
	`accion` varchar(30) NOT NULL,
	`responsable` varchar(100) NOT NULL,
	`motivo` text,
	`antes` text,
	`despues` text,
	`registrado_en` datetime NOT NULL,
	CONSTRAINT `auditoria_sistema_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `configuracion_censo` (
	`id` int NOT NULL,
	`hora_corte` varchar(5) NOT NULL DEFAULT '00:00',
	`alerta_estancia` int NOT NULL DEFAULT 14,
	`inicio_capacidad` datetime NOT NULL,
	CONSTRAINT `configuracion_censo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dias_censo` (
	`fecha` varchar(10) NOT NULL,
	`estado` varchar(10) NOT NULL,
	`version` int NOT NULL DEFAULT 0,
	CONSTRAINT `dias_censo_fecha` PRIMARY KEY(`fecha`)
);
--> statement-breakpoint
CREATE TABLE `partes_censo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fecha` varchar(10) NOT NULL,
	`version` int NOT NULL,
	`contenido` mediumtext NOT NULL,
	`huella` varchar(64) NOT NULL,
	`motivo` text NOT NULL,
	`responsable` varchar(100) NOT NULL,
	`registrado_en` datetime NOT NULL,
	CONSTRAINT `partes_censo_id` PRIMARY KEY(`id`),
	CONSTRAINT `partes_censo_version_uq` UNIQUE(`fecha`,`version`)
);
--> statement-breakpoint
CREATE TABLE `periodos_cama` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cama_id` int NOT NULL,
	`servicio_id` int NOT NULL,
	`servicio` varchar(60) NOT NULL,
	`especialidad` varchar(80) NOT NULL,
	`cama` varchar(10) NOT NULL,
	`habilitada` boolean NOT NULL,
	`motivo` text NOT NULL,
	`desde` datetime NOT NULL,
	`hasta` datetime,
	`responsable` varchar(100) NOT NULL,
	CONSTRAINT `periodos_cama_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `partes_censo` ADD CONSTRAINT `partes_censo_fecha_dias_censo_fecha_fk` FOREIGN KEY (`fecha`) REFERENCES `dias_censo`(`fecha`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `periodos_cama` ADD CONSTRAINT `periodos_cama_cama_id_camas_id_fk` FOREIGN KEY (`cama_id`) REFERENCES `camas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `auditoria_sistema_fecha_idx` ON `auditoria_sistema` (`registrado_en`);--> statement-breakpoint
CREATE INDEX `periodos_cama_fecha_idx` ON `periodos_cama` (`cama_id`,`desde`);