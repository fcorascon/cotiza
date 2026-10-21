# Worklog

---
Task ID: 6
Agent: main (Z.ai)
Task: Crear la sección Productos con los campos solicitados: código SAT, descripción, unidad (select), categoría (select), IVA (select), costo, margen de ganancia, subtotal (calculado) y notas.

Work Log:
- Agregado modelo `Producto` a prisma/schema.prisma con relaciones FK a Unidad, Categoria e Iva (onDelete: Restrict) + back-relations `productos` en los tres catálogos; db:push + db:generate.
- Creado src/lib/productos-utils.ts: normalizarNumeroTexto (acepta "$", "%", comas de miles y coma decimal), textoANumero, calcularSubtotal (costo × (1 + margen/100), redondeo a 2 decimales), formatearMoneda (MXN es-MX) y formatearPorcentaje.
- Creado src/lib/validations/producto.ts (zod v4): codigoSat requerido 3–20 (letras/números/punto/guion, auto-mayúsculas), descripción 3–200 colapsando espacios, unidadId/categoriaId/ivaId requeridos, costo ≥0 y ≤99,999,999 (2 decimales), margen 0–999 (2 decimales), notas opcionales ≤500; tipos Producto y ProductoConRelaciones en types.ts; SeccionApp + "productos".
- API REST: /api/productos (GET con include de relaciones y orden alfabético; POST que valida FKs inexistentes → 400 por campo, calcula subtotal en servidor, notas vacías → null) y /api/productos/[id] (PUT recalcula subtotal, DELETE; 404 si no existe).
- Refuerzo transversal: DELETE de /api/unidades/[id], /api/categorias/[id] y /api/ivas/[id] ahora capturan Prisma P2003 → 409 con mensaje claro ("está siendo utilizada por uno o más productos"), protegiendo la integridad referencial desde la UI.
- Componentes: productos/producto-form.tsx (Selects Radix ligados a react-hook-form, costo con "$" prefijo, margen con "%" sufijo, caja de SUBTOTAL calculado en vivo con aria-live, Textarea de notas, avisos con botón "Ir a Unidades/Categorías/IVA" cuando un catálogo está vacío — requiere prop onIrA), productos/productos-table.tsx (búsqueda en descripción/código/categoría/unidad/notas, tabla table-fixed con anchos por breakpoint, línea secundaria de código SAT en mono, indicador de notas con tooltip, montos con tabular-nums y whitespace-nowrap, edición, AlertDialog de borrado, skeleton, estados vacíos) y productos/productos-section.tsx (carga paralela de productos + 3 catálogos con Promise.all, icono Package).
- app-shell.tsx: ítem "Productos" (icono Package) tras IVA; versión 1.5; page.tsx con cadena condicional para las 6 secciones pasando onIrA={setSeccion} a Productos.
- Incidente resuelto: tras db:push el servidor viejo seguía vivo (dev.pid apuntaba a proceso muerto; el "nuevo" no pudo tomar el puerto 3000) — matado el árbol de procesos a mano (kill -9) y relanzado con .zscripts/dev.sh, esperando salud dentro de la misma llamada bash.
- Sembrados 5 productos vía scripts/seed_productos.py adaptándose a los catálogos ACTUALES del usuario (unidades ahora son CAJA/KG/MILLAR/PAQ/PZA): Papel bond carta 75g, Toner HP 85A negro, Silla ergonómica ejecutiva, Servicio de limpieza integral mensual, Café molido de especialidad 1kg.
- Pruebas API: POST vacío → 400 con fieldErrors en los 7 campos; unidad inexistente → 400 "La unidad seleccionada no existe"; PUT/DELETE inexistente → 404; PUT margen 45→50 recalculó 319→330; formatos tolerantes: costo "$1,234.50" + margen "10 %" → 201 con subtotal 1,357.95; margen límite 999 → subtotal 109.9 (10×10.99); margen 1000 → 400; DELETE unidad PZA en uso → 409 P2003. Corrección aplicada: normalizador ahora elimina "%" (los montos "30%" son válidos, como en IVA). Datos de prueba limpiados y Café molido restaurado a CAFETERÍA.
- Verificación E2E con agent-browser (1440px y 390px): validación de formulario vacío con errores en campo; alta de "Teclado inalámbrico Logitech" (TECNOLOGÍA/PZA/Tasa 16%) con subtotal en vivo $600.00 ANTES de guardar, toast "Producto registrado" y fila nueva; edición margen 20→30 con recálculo en vivo $650.00 y fila actualizada ($500.00/30%/$650.00); búsqueda "teclado"→1 fila y limpieza con teclado real→6; eliminación con AlertDialog→toast y 5 restantes; navegación cruzada Unidades↔Productos con datos intactos. Correcciones de la verificación: (1) aria-label en inputs Costo/Margen (el div decorativo rompía la asociación de label), (2) tabla: header "Margen" truncado y montos colisionando ("$1,500.0030%") → grid cambiado a xl:grid-cols-3 (tabla 2/3), anchos rebalanceados y whitespace-nowrap, (3) móvil: costo movido a línea bajo la descripción (sm:hidden) para eliminar la colisión con Subtotal, (4) SheetDescription sr-only en el menú móvil para eliminar la advertencia de Radix. Sin overflow horizontal en 390px. Capturas: download/captura-productos-escritorio.png y download/captura-productos-movil.png. Lint sin errores, consola limpia, dev.log limpio.

Stage Summary:
- Sección Productos funcional y persistente: CRUD completo con relaciones a los 3 catálogos, subtotal calculado automáticamente (costo + margen%) tanto en vivo en el formulario como en el servidor; 5 productos de ejemplo sembrados.
- Integridad referencial activa: unidades/categorías/tasas de IVA en uso por productos no pueden eliminarse (409 con mensaje claro).
- Archivos clave: prisma/schema.prisma (Producto + back-relations), src/app/api/productos/**, src/lib/productos-utils.ts, src/lib/validations/producto.ts, src/components/productos/**, src/components/app-shell.tsx, src/app/page.tsx; scripts/seed_productos.py y scripts/repruebas_productos.py reutilizables.
- El catálogo de productos queda listo para alimentar los conceptos de la sección Presupuestos (categoría, unidad, cantidad, precio/subtotal, IVA y totales).
- Siguiente paso sugerido: sección Presupuestos (cliente + conceptos tomando productos de este catálogo, con datos de empresa y diseño de la Configuración para el documento impreso).

---
Task ID: 5
Agent: main (Z.ai)
Task: Crear la sección Configuración del Sistema replicando la imagen adjunta: Datos de la Empresa (con logotipo), Servidor de Correo (SMTP) con prueba de conexión, Diseño Presupuesto y Diseño Recibo (color, fila, logotipo), botones Cancelar/Guardar.

Work Log:
- Instalado nodemailer@10.2.0 (+@types) para la prueba de conexión SMTP real.
- Agregado modelo `Configuracion` (registro único id "principal": datos de empresa, SMTP con smtpPassword privado, colores/fila/logotipo de presupuesto y recibo) a prisma/schema.prisma; db:push + db:generate.
- Creado src/lib/configuracion-defaults.ts con los datos de la imagen (Comercializadora Suncatc / del Norte / CSN200210B44 / ALFARAZ 3595 / 686.4333453 / mail.suncatcher.com.mx:465 SSL) y logotipo sol SVG pre-diseñado como data URL.
- Validación zod (RFC, teléfono, email, puerto 1–65535 como texto, enums SSL/TLS/NINGUNA y normal/grande, logotipos data URL ≤2MB) en src/lib/validations/configuracion.ts; tipos Configuracion y SeccionApp + "configuracion".
- API: /api/configuracion GET (crea registro con valores iniciales si no existe; nunca expone smtpPassword) y PUT (smtpPassword vacío conserva la almacenada); /api/configuracion/probar-smtp POST (nodemailer verify + envío opcional de correo de prueba a destino, mensajes de error legibles por código: EAUTH, ETIMEDOUT, ENOTFOUND, ECONNREFUSED, certificado).
- Componentes: configuracion-section.tsx (carga, guardar con mapeo de fieldErrors, cancelar restaurando valores cargados, barra inferior sticky Cancelar/Guardar, skeletons), empresa-card.tsx (RFC auto-mayúsculas), smtp-card.tsx (Select de cifrado, contraseña write-only con pista, panel de prueba con resultado inline verde/rojo y botón "Ver envíos · Próximamente"), diseno-card.tsx reutilizable (input type=color, Select Normal/Grande, logo), logo-upload-field.tsx (FileReader a data URL, valida tipo/1.5MB, preview y quitar).
- app-shell.tsx: ítem "Configuración" (icono Settings) habilitado; versión 1.4; page.tsx refactorizado a mapa SECCIONES[seccion] para las 5 secciones.
- Verificación API: GET crea con defaults; PUT guarda y conserva contraseña; RFC inválido → 400 con fieldErrors; probar-smtp con destino inválido → 400; host inexistente → ok:false con mensaje claro.
- Verificación E2E con agent-browser (1440px y 390px): datos precargados de la imagen, prueba de conexión REAL contra mail.suncatcher.com.mx (verify exitoso; envío rechazado sin contraseña → mensaje honesto), carga de PNG en Logotipo (Presupuesto) persistida como data URL, Guardar/Cancelar verificados (teléfono revertido), cambio de color #DC2626 y fila Grande persistidos, luego restauración al estado original. Capturas: download/captura-configuracion-escritorio.png, captura-configuracion-scroll.png y captura-configuracion-movil.png. Lint sin errores, dev.log limpio, sin errores de consola.

Stage Summary:
- Sección Configuración funcional y persistente con los datos de la empresa precargados; prueba SMTP real operativa; 5 módulos activos (Clientes, Unidades, Categorías, IVA, Configuración).
- Archivos clave: prisma/schema.prisma (Configuracion), src/app/api/configuracion/**, src/lib/configuracion-defaults.ts, src/lib/validations/configuracion.ts, src/components/configuracion/**, src/components/app-shell.tsx, src/app/page.tsx.
- La configuración queda lista para que Presupuestos lea datos de empresa, logotipos, colores e IVA al generar documentos.
- Siguiente paso sugerido: sección Presupuestos (cliente + conceptos con categoría, unidad, cantidad, precio, IVA y totales).

---
Task ID: 4
Agent: main (Z.ai)
Task: Crear la sección IVA (catálogo de tasas) con las opciones indicadas por el usuario: 0%, 8% y 16%, siguiendo el patrón de Categorías/Unidades.

Work Log:
- Agregado modelo `Iva` (campo numérico único `tasa` Float) a prisma/schema.prisma; db:push + db:generate ejecutados.
- Creado src/lib/validations/iva.ts (zod v4: acepta "16", "16%", "16 %", coma decimal; valida 0–100 con regex y refinamientos; IvaInput = string para integración limpia con react-hook-form) y tipo Iva en types.ts; SeccionApp ahora incluye "ivas".
- API REST: src/app/api/ivas/route.ts (GET ordenado por tasa ascendente, POST que convierte a número y rechaza duplicados → 409) y src/app/api/ivas/[id]/route.ts (PUT y DELETE con 404 y 409).
- Nuevos componentes: ivas/iva-form.tsx (label "Tasa de IVA (%)", inputMode decimal, carga de editing con String(tasa)), ivas/ivas-table.tsx (búsqueda que ignora el símbolo "%", valores con tabular-nums, edición, AlertDialog de borrado, skeleton, estados vacíos) e ivas/ivas-section.tsx (icono Percent, título "IVA").
- app-shell.tsx: ítem "IVA" (icono Percent) habilitado tras Categorías; versión 1.3 en el pie del sidebar; page.tsx conmuta las 4 secciones por estado.
- Reinicio del dev server con flujo oficial (.zscripts/dev.sh + dev.pid); nota: el primer intento fue eliminado por el sandbox durante db:push — relanzar y esperar dentro de la misma llamada bash resolvió el problema.
- Sembradas las 3 tasas vía API: 0, 8 y 16.
- Pruebas API: duplicado "16 %" → 409 (el transform elimina espacio y %); "150" → 400 fuera de rango; "abc" → 400 formato; ciclo temporal 10 → PUT 10.5 → DELETE correctos; lista final 0/8/16.
- Verificación E2E con agent-browser (1440px y 390px): sección IVA con 3 filas ordenadas, duplicado rechazado con error en campo, alta "4" → renombrado a "10.5" → eliminación con confirmación (3 restantes), búsqueda "16%" → 1 fila y limpieza con teclado real → 4 filas, navegación cruzada Clientes ↔ IVA con datos intactos. Capturas: download/captura-iva-escritorio.png y download/captura-iva-movil.png. Lint sin errores, dev.log limpio, sin errores de consola.

Stage Summary:
- Sección IVA funcional y persistente con las tasas 0%, 8% y 16% precargadas; tasa almacenada como Float para cálculos futuros en Presupuestos; 4 módulos activos en la navegación.
- Archivos clave: prisma/schema.prisma (Iva), src/app/api/ivas/**, src/lib/validations/iva.ts, src/components/ivas/**, src/components/app-shell.tsx, src/app/page.tsx.
- Siguiente paso sugerido: sección Presupuestos (cliente + conceptos con categoría, unidad, cantidad, precio, IVA y totales).

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
