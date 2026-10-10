CREATE TABLE `usuarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`usuario` varchar(64) NOT NULL,
	`nombre` varchar(100) NOT NULL,
	`rol` varchar(20) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`version_sesion` int NOT NULL DEFAULT 1,
	`activo` boolean NOT NULL DEFAULT true,
	`creado_en` datetime NOT NULL,
	`actualizado_en` datetime NOT NULL,
	CONSTRAINT `usuarios_id` PRIMARY KEY(`id`),
	CONSTRAINT `usuarios_usuario_unique` UNIQUE(`usuario`)
);
