# Sincronización del censo · 10 de octubre de 2026

La base de Aiven tiene aplicada la migración 0004_hegb_hospitalizaciones. Se conservaron 34 pacientes, 41 ingresos, 31 egresos, 60 camas, 50 médicos y el catálogo de diagnósticos. Las diez hospitalizaciones activas tienen ocupación y ubicación vigentes.

Las fechas anteriores se declararon en hora de Perú y se convirtieron a UTC. Se reconstruyeron 47 períodos de ubicación a partir de los ingresos, egresos y seis traslados existentes. El ingreso 34 contiene una corrección autorizada de datos de prueba: cama inicial 59 y traslado a cama 35 al 12/09/2026 14:20 de Perú; se preservó la fecha de ingreso y se documentó la modificación en movimientos. No se detectaron solapamientos después de reconstruir el recorrido.

Las doce tablas inm_* de la aplicación inmobiliaria fueron eliminadas con autorización, después de respaldar íntegramente la base.

## Desarrollo y producción

El repositorio incluye un devcontainer con Node 24. Codespaces ejecuta npm ci al crear el entorno. Configurar la conexión y SESSION_SECRET en los secretos de Codespaces, sin archivos .env con credenciales; nunca subirlos al repositorio. Usar npm run dev para el puerto 3000.

Vercel sigue la rama main de cpumaricramoori01-projx/censo-hospitalario. Necesita DATABASE_URL, DATABASE_SSL=true, DATABASE_CA, SESSION_SECRET. Las cuentas se almacenan en usuarios y se administran desde la pantalla Usuarios; AUTH_USERS ya no es necesario. La conexión valida el certificado CA de Aiven. Node 24 está fijado en package.json y en el proyecto Vercel.

El script scripts/seed-demo.ts pertenece al esquema anterior. La preparación vigente y protegida de datos ficticios es scripts/seed-demo.mjs y acepta exclusivamente la base local de pruebas documentada en README.md.
