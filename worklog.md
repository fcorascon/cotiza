# Worklog

---
Task ID: 3
Agent: main (Z.ai)
Task: Crear la sección Categorías con las 12 opciones indicadas por el usuario (catálogo con campo "categoría"), siguiendo el patrón de Unidades.

Work Log:
- Agregado modelo `Categoria` (campo único `categoria`) a prisma/schema.prisma y sincronizado con db:push.
- Creado src/lib/validations/categoria.ts (zod: min 3, máx 80, colapsa espacios) y tipo Categoria en types.ts; SeccionApp ahora incluye "categorias".
- API REST: src/app/api/categorias/route.ts (GET alfabético, POST con rechazo de duplicados insensibles a mayúsculas/espacios → 409) y src/app/api/categorias/[id]/route.ts (PUT y DELETE).
- Nuevos componentes: categorias/categoria-form.tsx, categorias/categorias-table.tsx (búsqueda en vivo, tabla table-fixed, edición, AlertDialog de borrado, skeleton, estados vacíos) y categorias/categorias-section.tsx.
- app-shell.tsx: ítem "Categorías" (icono Tags) habilitado; versión 1.2 en el pie del sidebar; page.tsx conmuta las 3 secciones por estado.
- Reiniciado dev server con flujo oficial (.zscripts/dev.sh + dev.pid) para cargar el cliente Prisma nuevo; servidor estable.
- Sembradas las 12 categorías solicitadas con ortografía corregida: ARTÍCULOS DE OFICINA, CAFETERÍA, COMIDA, CONSTRUCCIÓN, HIGIENE, LIMPIEZA, MOBILIARIO Y EQUIPO, PAPELERÍA, TINTAS Y TONERS, SALUD, TECNOLOGÍA, REGALOS.
- Verificación E2E con agent-browser: alta "FERRETERÍA", duplicado "papelería" rechazado con error en campo, renombrado a "FERRETERÍA Y HERRAMIENTAS", eliminación con confirmación (12 restantes), búsqueda por teclado ("tec"→1), navegación entre Clientes/Unidades/Categorías intacta. Capturas: download/captura-categorias-escritorio.png y download/captura-categorias-movil.png. Lint sin errores, sin errores de consola.

Stage Summary:
- Sección Categorías funcional y persistente con las 12 categorías precargadas; navegación con 3 módulos activos.
- Archivos clave: prisma/schema.prisma (Categoria), src/app/api/categorias/**, src/lib/validations/categoria.ts, src/components/categorias/**, src/components/app-shell.tsx, src/app/page.tsx.
- Siguiente paso sugerido: sección Presupuestos (cliente + conceptos con categoría, unidad, cantidad, precio, IVA y totales).


---
Task ID: 2
Agent: main (Z.ai)
Task: Crear la sección Unidades (catálogo) con el campo "unidad": formulario + grid, integrada a la navegación lateral junto a Clientes.

Work Log:
- Agregado modelo `Unidad` (campo único `unidad`, índice unique) a prisma/schema.prisma y sincronizado con db:push.
- Creado src/lib/validations/unidad.ts (zod: min 2, máx 60, colapsa espacios internos) y tipos Unidad/SeccionApp en src/lib/types.ts.
- API REST: src/app/api/unidades/route.ts (GET ordenado alfabético, POST con rechazo de duplicados insensible a mayúsculas/espacios → 409) y src/app/api/unidades/[id]/route.ts (PUT y DELETE).
- Refactor de navegación: app-shell.tsx ahora usa botones con estado (SeccionApp) en lugar de rutas, ítem "Unidades" habilitado y "Presupuestos" sigue como próximamente; menú móvil conservado.
- Nuevos componentes: unidades/unidad-form.tsx, unidades/unidades-table.tsx (búsqueda en vivo, tabla table-fixed, edición, AlertDialog de borrado, skeleton, estados vacíos), unidades/unidades-section.tsx; clientes/clientes-section.tsx extraído de page.tsx; page.tsx conmuta secciones por estado (restricción: solo ruta "/").
- Incidente resuelto: tras db:push el dev server seguía con el cliente Prisma viejo (db.unidad undefined) y procesos ad-hoc eran eliminados por el sandbox; solución: regenerar cliente y reiniciar con el flujo oficial (.zscripts/dev.sh + dev.pid).
- Sembradas 7 unidades de ejemplo: Jornada, Kilogramo, Lote, Metro cuadrado (m²), Metro lineal (ml), Pieza, Servicio.
- Verificación E2E con agent-browser: cambio de sección, alta "Caja", duplicado "pieza" rechazado con error en campo, renombrado a "Par de piezas", eliminación con confirmación (7 restantes), búsqueda por teclado real ("metro"→2, "pie"→1), regreso a Clientes (3 registros intactos). Capturas: download/captura-unidades-escritorio.png y download/captura-unidades-movil.png. Lint sin errores, dev.log limpio.

Stage Summary:
- Sección Unidades funcional y persistente (SQLite), navegable junto a Clientes sin rutas nuevas.
- Archivos clave: prisma/schema.prisma (Unidad), src/app/api/unidades/**, src/lib/validations/unidad.ts, src/components/unidades/**, src/components/clientes/clientes-section.tsx, src/components/app-shell.tsx, src/app/page.tsx.
- Siguiente paso sugerido: sección Presupuestos (cliente + conceptos con unidad, cantidad, precio, IVA y totales).


---
Task ID: 1
Agent: main (Z.ai)
Task: Crear aplicación para administrar presupuestos — Sección Clientes (form + grid) con campos: razón social/nombre, RFC, dirección completa (calle, número, colonia, C.P., ciudad, estado), teléfono y correo electrónico.

Work Log:
- Inicializado entorno fullstack Next.js 16 (script init-fullstack.sh).
- Definido modelo `Cliente` en prisma/schema.prisma (SQLite, índices en razonSocial y RFC) y sincronizado con `bun run db:push`.
- Creado esquema de validación zod compartido en src/lib/validations/cliente.ts (RFC mexicano 12-13 caracteres, C.P. 5 dígitos, email y teléfono validados).
- API REST: src/app/api/clientes/route.ts (GET con búsqueda opcional, POST con detección de RFC duplicado 409) y src/app/api/clientes/[id]/route.ts (PUT y DELETE con validaciones).
- UI: src/components/app-shell.tsx (sidebar escritorio + menú móvil con Sheet, sección "Presupuestos" marcada próximamente), src/components/clientes/cliente-form.tsx (react-hook-form + zod, RFC auto-mayúsculas, C.P. solo dígitos, errores de servidor mapeados a campos) y src/components/clientes/clientes-table.tsx (búsqueda en vivo, tabla table-fixed con truncado, edición con carga al formulario, eliminación con AlertDialog, skeleton de carga, estados vacíos).
- Página principal src/app/page.tsx integra form + grid en layout responsive (form 2/5, grid 3/5 en desktop; apilado en móvil). Layout metadata en español (lang="es").
- Verificación: lint sin errores; CRUD probado vía curl (201/400/409/200); verificación E2E con agent-browser (registro, edición, eliminación, búsqueda, validación RFC, estados vacíos, responsive 1440px y 390px). Capturas guardadas en download/captura-escritorio.png y download/captura-movil.png.
- Corrección aplicada durante verificación: tabla desbordaba horizontalmente → migrada a table-fixed con anchos porcentuales y truncado en celdas.

Stage Summary:
- App de presupuestos funcional con módulo Clientes completo (CRUD real en SQLite vía Prisma).
- Archivos clave: prisma/schema.prisma, src/lib/validations/cliente.ts, src/app/api/clientes/**, src/components/app-shell.tsx, src/components/clientes/**, src/app/page.tsx.
- 3 clientes de ejemplo quedaron sembrados en la base para demostración.
- Próximos pasos sugeridos: sección Presupuestos (relación con Cliente), catálogo de conceptos/partidas, exportación PDF.
