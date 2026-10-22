# Worklog

---
Task ID: 7
Agent: main (Z.ai)
Task: Crear la sección Presupuestos: cliente (select de Clientes), fecha (selector), observaciones, productos del catálogo (producto, código, unidad, cantidad e importe) y SUB TOTAL + IVA + TOTAL.

Work Log:
- Agregados modelos `Presupuesto` (cliente FK Restrict, fecha texto ISO YYYY-MM-DD, observaciones, subtotal/iva/total) y `PresupuestoItem` (FK a presupuesto Cascade, productoId nullable SetNull, snapshots: descripcion/codigoSat/unidad, cantidad, precioUnitario, importe, ivaTasa, ivaImporte, orden) + back-relations `presupuestos` en Cliente y `presupuestoItems` en Producto; db:push + db:generate.
- Creado src/lib/presupuestos-utils.ts: redondear2, calcularTotalesPresupuesto (importe = cantidad × precio unitario por partida; IVA por tasa de cada producto; SUB TOTAL = Σ importes; TOTAL = SUB TOTAL + IVA, con desglose ivaPorTasa), formatearFechaISO (sin Date para evitar desfases de zona) y fechaHoyISO.
- Validación zod v4 (src/lib/validations/presupuesto.ts): clienteId requerido, fecha regex ISO, observaciones opcionales ≤1000 → null, items min 1 con productoId opcional (soporta partidas huérfanas), cantidad > 0, precioUnitario ≥ 0, ivaTasa 0–100; mensajes de campo en español (clienteId/fecha/items con { message }).
- API /api/presupuestos: GET (include cliente {id, razonSocial} + items por orden, ordenado fecha desc) y POST que SIEMPRE recalcula importes/IVA/totales en el servidor y valida que el cliente y los productos existan (400 con fieldErrors campo a campo, partidas con prefijo "Partida N:"). API /api/presupuestos/[id]: GET detalle, PUT (reemplaza partidas con deleteMany+create anidado atómico, recalcula) y DELETE (404 si no existe). Los precios unitarios son "fotografías" congeladas: editar el costo/margen de un producto no re-precia presupuestos ya emitidos.
- Refuerzo transversal: DELETE /api/clientes/[id] ahora captura Prisma P2003 → 409 "está siendo utilizado por uno o más presupuestos" (mismo patrón que unidades/categorías/ivas).
- Componentes: presupuestos/presupuesto-form.tsx (Selects de cliente y producto con datos del catálogo, fecha type=date con hoy por defecto, observaciones Textarea, caja informativa del producto seleccionado — código SAT/unidad/precio/IVA —, "Agregar" con cantidad, partidas con cantidad editable inline que recalcula en vivo, panel aria-live con SUB TOTAL + desglose de IVA por tasa cuando hay >1 tasa + TOTAL, avisos con botón "Ir a Clientes/Productos" cuando un catálogo está vacío, validación cliente con errores inline + toast, tarjetas móviles de partidas), presupuestos/presupuestos-table.tsx (búsqueda por cliente/fecha/productos/observaciones, columna Fecha/Cliente/Productos/Sub total/IVA/Total/Acciones, ojo = Dialog de detalle completo con partidas y totales, edición, AlertDialog de borrado con resumen, skeleton, estados vacíos; en móvil (<sm) la tabla se sustituye por tarjetas fecha+total+cliente+productos+acciones) y presupuestos/presupuestos-section.tsx (ReceiptText, carga paralela presupuestos/clientes/productos con Promise.all, onIrA).
- app-shell.tsx: "Presupuestos" habilitado (ReceiptText) en segundo lugar tras Clientes; versión 1.6 con el módulo en el pie; page.tsx con rama "presupuestos" pasando onIrA={setSeccion}.
- Pruebas API (scripts/pruebas_presupuestos.mjs): POST vacío → 400 con 3 fieldErrors; sin partidas → 400; cliente inexistente → 400; POST válido Café×2 (16%) + Limpieza×3 (0%) → 201 con sub 6,510 / IVA 105.6 / total 6,615.6 exactos; PUT cantidad 2→5 → 7,500/264/7,764; PUT/GET inexistente → 404; DELETE cliente en uso → 409 P2003; POST sin observaciones → 201 con null; limpieza completa.
- Verificación E2E con agent-browser (1440px y 390px): alta de presupuesto (Distribuidora El Águila, Café×2 + Limpieza×1) con totales en vivo $660/$105.60/$765.60 y luego $2,610 + desglose "IVA 0% / IVA 16%" antes de guardar; fila $2,610.00/$105.60/$2,715.60; edición cantidad 2→3 con recálculo en vivo $2,940/$158.40/$3,098.40 y fila actualizada; Dialog de detalle con partidas (unidad, IVA%, código) y totales; búsqueda "limpieza" encuentra por producto de partida, "zzz" → Sin resultados, limpieza con teclado real → 1 fila; eliminación con AlertDialog (resumen cliente+fecha+total+partidas) → estado vacío; validación submit vacío → toast "Datos incompletos" + errores inline "Seleccione un cliente" y "Agregue al menos un producto"; presupuesto demo final dejado en la BD (María Fernanda López, $2,715.60). Navegación cruzada Productos↔Presupuestos con datos intactos; sin overflow horizontal (scrollWidth = clientWidth en 390 y 1440); consola y dev.log limpios; lint sin errores.
- Correcciones de la verificación: (1) el botón "Ver" invadía la columna Total → anchos rebalanceados (Acciones 110px, botones h-8 w-8), (2) en 390px la tabla comprimida seguía colisionando (fecha/cliente/total) → reemplazada por tarjetas móviles y tabla solo sm+; re-capturas verificadas sin solapes.

Stage Summary:
- Sección Presupuestos funcional y persistente: alta/edición/eliminación de presupuestos con partidas del catálogo de productos, cantidades editables con recálculo en vivo, IVA por tasa de cada producto, desglose y totales siempre calculados en el servidor; precios de partida congelados (fotografía del producto).
- Integridad referencial activa: clientes con presupuestos no pueden eliminarse (409); borrar un producto conserva las partidas históricas (SetNull + snapshots).
- Archivos clave: prisma/schema.prisma (Presupuesto + PresupuestoItem), src/app/api/presupuestos/**, src/lib/presupuestos-utils.ts, src/lib/validations/presupuesto.ts, src/components/presupuestos/**, src/components/app-shell.tsx, src/app/page.tsx; scripts/pruebas_presupuestos.mjs reutilizable.
- 7 módulos activos: Clientes · Presupuestos · Unidades · Categorías · IVA · Productos · Configuración (versión 1.6).
- Siguiente paso sugerido: imprimir/enviar el presupuesto (PDF y correo con SMTP ya configurado en Configuración) usando presupuestoColor/Fila/Logo, o sección Recibos/Cobros.

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

---
Task ID: 8
Agent: main (Z.ai)
Task: Cambiar el color negro del tema por #191970 (azul medianoche) en toda la aplicación.

Work Log:
- Identificado el origen del color negro: variables del tema en src/app/globals.css (:root), no hay colores negros fijos en componentes (los bg-black/50 son velos de modales estándar y se conservan).
- Reemplazos aplicados en :root: --foreground, --card-foreground, --popover-foreground, --primary, --secondary-foreground, --accent-foreground, --sidebar-foreground, --sidebar-primary y --sidebar-accent-foreground ahora usan #191970 literal.
- --ring y --sidebar-ring actualizados a oklch(0.55 0.13 272.8), tinte medio del mismo tono azul medianoche para anillos de foco visibles.
- Tema .dark sin cambios (la app solo usa tema claro; layout.tsx no aplica clase dark).
- Verificación con agent-browser: getComputedStyle del body y del botón primario devuelven rgb(25, 25, 112) = #191970; navegación a secciones Clientes e IVA correcta; sin errores de página.
- Capturas: download/captura-color-191970-clientes.png y download/captura-color-191970-iva.png. Lint sin errores; servidor healthy (HTTP 200, APIs respondiendo).

Stage Summary:
- Identidad visual actualizada: negro reemplazado por azul medianoche #191970 en texto, botones primarios, menú lateral activo, títulos e iconos; gris neutro de textos secundarios y bordes se mantiene para legibilidad.
- Archivo modificado: src/app/globals.css (solo bloque :root).

---
Task ID: 9
Agent: main (Z.ai)
Task: Impresión del presupuesto como documento formal (vista previa + PDF) usando el diseño definido en Configuración (presupuestoColor, presupuestoFila, presupuestoLogo) y los datos de la empresa.

Work Log:
- APIs /api/presupuestos y /api/presupuestos/[id]: SELECCION_CLIENTE ampliado a todos los campos del cliente (RFC, calle, número, colonia, C.P., ciudad, estado, teléfono, email) para el documento impreso; tipo Presupuesto en types.ts ahora incluye `cliente: Cliente` completo (la tabla/forma solo usaba razonSocial, sin impacto).
- Nuevo componente presupuestos/presupuesto-documento.tsx: hoja formal tamaño carta con encabezado de empresa (logotipo presupuestoLogo ?? logo, con monograma de respaldo en color), nombre comercial/razón legal/RFC/dirección/contacto, título PRESUPUESTO en el color configurado, folio derivado del id (PTO-XXXXXX) y fecha formateada; bloque CLIENTE con datos fiscales y de contacto completos; tabla de partidas table-fixed (#, Producto con unidad + Cód. SAT, Cantidad, P. unitario, IVA %, Importe) con encabezado en el color de Configuración y tamaño de fila normal/grande (py-2 vs py-3.5); totales con desglose de IVA por tasa cuando hay más de una y banda TOTAL en color; observaciones con borde al color; pie "Gracias por su preferencia" + contacto.
- Impresión: overlay de vista previa montado con createPortal en <body> (clase "capa-impresion", z-70) con barra Cerrar/Imprimir / Guardar PDF; mientras está abierto agrega clase "imprimiendo" al body, bloquea el scroll, ajusta document.title (nombre sugerido del PDF) y cierra con Escape; CSS @media print en globals.css (body.imprimiendo > *:not(.capa-impresion) display:none, barra oculta, hoja sin sombras/bordes) + @page letter margin 8mm — al imprimir solo sale el documento.
- presupuestos-table.tsx: botón impresora (Imprimir / PDF) en acciones de escritorio (columna 110px → 148px), en tarjetas móviles y en el Dialog de detalle ("Imprimir / Guardar PDF"); presupuestos-section.tsx carga /api/configuracion en paralelo (Promise.all) y la pasa a la tabla; app-shell versión 1.7.
- Correcciones de la verificación móvil (390px): el header en flex-col con items-start no ajustaba el ancho y el nombre con truncate forzaba 522px de scroll interno → header flex-col + sm:flex-row sm:items-start; tabla a table-fixed; paddings responsivos px-4/py-6 sm:px-10/sm:py-10; columnas # e IVA ocultas en móvil (el % de IVA se muestra en la línea secundaria del producto) — capa y hoja quedaron sin scroll horizontal (scrollWidth = clientWidth).
- Verificación E2E (agent-browser 1440px y 390px): vista previa con logo SunCatcher, color rgb(29,78,216) = #1D4ED8 configurado, folio PTO-D6AH5B, fecha 21/10/2026, cliente completo (RFC LOLM890215XY2, Villahermosa, Tabasco), partidas con unidad y Cód. SAT, SUB TOTAL $2,610.00 / IVA 0% $0.00 / IVA 16% $105.60 / TOTAL $2,715.60 (coincide con la fila de la tabla); fila "normal" (py-2) acorde a presupuestoFila; cierre con Esc restaura body/scroll/título; botón del Dialog abre la vista previa; PDF generado con page.pdf: 1 página, solo el documento (sin barra ni UI de la app), texto completo verificado con pdftotext. Capturas: download/captura-impresion-vista-previa.png, download/captura-impresion-movil.png y download/presupuesto-impresion.pdf. Lint sin errores, consola y dev.log limpios.

Stage Summary:
- Los presupuestos ya se imprimen como documento formal: vista previa en pantalla + "Imprimir / Guardar PDF" desde el ícono de la tabla, la tarjeta móvil o el detalle; el PDF respetan el diseño de la sección Configuración (color, tamaño de fila, logotipo) y los datos de la empresa.
- Archivos clave: src/components/presupuestos/presupuesto-documento.tsx (nuevo), src/components/presupuestos/presupuestos-table.tsx, src/components/presupuestos/presupuestos-section.tsx, src/app/globals.css (@media print + @page), src/app/api/presupuestos/route.ts + [id]/route.ts (cliente completo), src/lib/types.ts, src/components/app-shell.tsx (v1.7).
- Siguiente paso sugerido: enviar el presupuesto por correo con el SMTP ya configurado (nodemailer), o sección Recibos/Cobros usando reciboColor/reciboFila/reciboLogo.

---
Task ID: 10
Agent: main (Z.ai)
Task: Importar los clientes del archivo upload/clientes.csv a la BD de la aplicación.

Work Log:
- Analizado upload/clientes.csv (25 filas, campos entrecomillados, dirección en texto libre: direccion/ciudad/codpostal/provincia) contra el modelo Cliente actual (dirección estructurada: calle/numero/colonia/codigoPostal/ciudad/estado).
- Mejorado formatearDireccion() en src/components/clientes/clientes-table.tsx: ahora omite partes vacías para no renderizar ", ," en registros con dirección incompleta (mismo resultado para registros completos). Lint limpio.
- Creado scripts/importar-clientes.ts (bun + Prisma): parser CSV RFC-4180, mapeo manual fila por fila de la dirección libre a campos estructurados (interiores como "LOCAL 1"/"PISO 8, INTERIOR 101" se conservan junto al número; "MATAMOROS, TAMAULIPAS" → ciudad/estado; estados normalizados: B.C./MEXICALI→BAJA CALIFORNIA, CDMX→CIUDAD DE MÉXICO), razonSocial = nombre si personafisica=1, si no razonsocial||nombre; omite filas con debaja=1; conserva la fecha de alta original como createdAt; detecta RFC duplicados contra la BD.
- Ejecutada la importación: 23 clientes insertados, 2 omitidos por debaja=1 (PODER LEGISLATIVO codcliente 1, duplicado del activo; TEST CLIENTE EDITADO codcliente 23), total 26 en BD.
- Verificación: API /api/clientes devuelve 26 con datos correctos; navegador confirma "26 clientes en total · 26 mostrados", búsqueda funcional (filtro "PARQUE") y captura guardada en download/clientes-importados.png.

Stage Summary:
- Los 23 clientes activos del sistema origen ya están disponibles en la app (seleccionables en Presupuestos), ordenados por fecha de alta.
- Notas de datos heredados: 6 clientes sin RFC (se muestran con RFC vacío; el formulario lo pedirá al editar), RFC placeholders "XXXXXXXXXXX"/"XXX000000" y RFC incompleto "RALJ701220" se conservaron tal cual; algunos clientes sin teléfono/correo/dirección.
- Script reutilizable en scripts/importar-clientes.ts para futuras cargas.

---
Task ID: 11
Agent: main (Z.ai)
Task: Revisar y corregir el desbordamiento de textos en las secciones de catálogos.

Work Log:
- Diagnóstico con agent-browser + eval (scrollWidth vs clientWidth de cada elemento, overflow visible) en anchos 390/768/1024/1280/1440/1536:
  · Formulario de Productos a 1280–1535px: 19 elementos desbordados — la tarjeta media ~302px pero el form usaba sm:grid-cols-2 y los SELECT (Categoría/Unidad/IVA) no cabían.
  · Tabla de Productos a 1280px: TH Unidad/Margen y TD IVA/Subtotal derramaban; a 390px la celda Subtotal ($1,950.00) y la línea "Costo:" derramaban.
  · Tabla de Presupuestos a 1280px: celda Fecha y el texto "+ N productos más" derramaban 4–5px.
  · Unidades/Categorías/IVA y Clientes: sin desbordes.
- Correcciones:
  · productos-section.tsx: acomodo lado-a-lado movido de xl a 2xl (grid-cols-3), para que la tabla de 8 columnas y el formulario de 9 campos solo compartan fila cuando hay ~1536px.
  · producto-form.tsx: grid de campos sm:grid-cols-2 → 2xl:grid-cols-1 con [&>*]:min-w-0 y col-spans ajustados (2 col apilado, 1 col lado-a-lado).
  · productos-table.tsx: móvil Descripción 55→48% / Subtotal 35→42% + subtotal text-xs sm:text-sm; escritorio Descripción 22% / Categoría 14%; línea "Costo:" con truncate.
  · presupuestos-table.tsx: Fecha 10→11% / Cliente 28→27%; "+ N productos más" con truncate.
- Verificación post-fix: 0 desbordes en las 6 secciones × 6 anchos (390/768/1024/1280/1440/1536); lint limpio; capturas antes/después en download/ (antes-overflow-productos-1280.png, despues-productos-1280.png, despues-productos-390.png).

Stage Summary:
- Causa raíz: anchos basados en viewport (sm/xl) no correspondían al ancho real de la tarjeta cuando la sección pasa a lado-a-lado; los SELECT/grid items no podían encoger (min-width auto).
- Productos ahora se apila hasta 2xl; los SELECT usan min-w-0; tablas con anchos recalibrados en móvil y 1280px.
- Diagnóstico reproducible con el eval de scrollWidth incluido en este registro para futuras revisiones.

---
Task ID: 12
Agent: main (Z.ai)
Task: 1) Convertir todos los campos de texto a mayúsculas. 2) Botón "Nuevo" que muestra el formulario oculto; al inicio solo las grids.

Work Log:
- Mayúsculas (3 capas para cobertura total):
  · Schemas Zod (src/lib/validations/): .toUpperCase() en cliente (razonSocial, calle, numero, colonia, ciudad, estado; rfc ya lo tenía), unidad y categoria (en su transform de espacios), producto (descripcion, notas; codigoSat ya lo tenía), presupuesto (items descripcion/codigoSat/unidad + observaciones), configuracion (nombreComercial, razonLegal, direccion). Como las rutas API usan los mismos schemas con safeParse, el servidor también normaliza.
  · Formularios: onChange con toUpperCase() para feedback inmediato en los mismos campos (cliente-form, unidad-form, categoria-form, producto-form descripcion+notas, presupuesto-form observaciones, empresa-card). Correos y teléfonos se quedan como estaban (email conserva .toLowerCase()).
  · Migración de datos existentes: scripts/migrar-mayusculas.ts (bun+Prisma) — 3 clientes, 5 productos y 3 partidas actualizados; unidades/categorías ya estaban en mayúsculas; incluyó limpieza del texto literal "null" en notas de producto → null real. Primer intento falló porque el helper convertía "" en null y colonia es NOT NULL; corregido a solo-null. Diagnóstico previo (scripts/diagnostico-mayusculas.ts) confirmó cero colisiones de unicidad al pasar a mayúsculas (el script de migración fusiona duplicados si aparecieran).
- Formularios ocultos + botón "Nuevo" en las 6 secciones (clientes, unidades, categorias, ivas, productos, presupuestos):
  · Estado formVisible (default false): al entrar solo se ve la tabla; botón "Nuevo cliente/unidad/categoría/tasa de IVA/producto/presupuesto" (icono Plus) en el header (flex-col sm:flex-row justify-between, sin overflow).
  · handleNuevo: resetea editing y abre el formulario; handleEdit: carga el registro y abre; al guardar o cancelar el formulario se vuelve a ocultar y el botón "Nuevo" reaparece. ScrollIntoView del formulario cuando se monta (useEffect + ref bandera, reemplaza el enfoque previo solo-móvil).
  · El formulario se desmonta condicionalmente (layout: grid xl:grid-cols-5 / 2xl:grid-cols-3 solo cuando es visible; la tabla ocupa todo el ancho cuando está oculto). presupuestos-section apilado (space-y-6).
  · Todos los formularios ahora muestran "Cancelar" también en modo creación (antes solo existía "Cancelar edición"), para poder cerrar el formulario sin guardar.
- Verificación E2E (agent-browser, 1440px y 390px): estado inicial sin form en las 6 secciones; "prueba de mayusculas s.a. de c.v." se captura y guarda como "PRUEBA DE MAYUSCULAS S.A. DE C.V." (BD verificada, email intacto en minúsculas); edición de unidad carga "CAJA" en el formulario montado; observaciones de presupuesto "condiciones de pago a 30 dias" → "CONDICIONES DE PAGO A 30 DIAS"; tras guardar el form se oculta y reaparece "Nuevo"; móvil 390px sin scroll horizontal y con auto-scroll al form. Registro de prueba eliminado de la BD. Lint limpio, consola/servidor sin errores.
- Capturas: download/nuevo-formulario-oculto-clientes.png, download/nuevo-formulario-abierto-clientes.png, download/nuevo-formulario-oculto-presupuestos.png, download/nuevo-movil-390-clientes.png, download/nuevo-movil-390-formulario.png.

Stage Summary:
- Regla global: todo texto capturado se almacena y muestra en MAYÚSCULAS (clientes, unidades, categorías, productos, presupuestos y datos de la empresa); correos/teléfonos excluidos. La Configuración existente no se migró (se convertirá al volver a guardar).
- UX: las secciones abren en modo consulta (solo grid); el formulario aparece con "Nuevo" o al editar, y se cierra al guardar/cancelar.
- Archivos: 5 validations/*.ts, 6 formularios, 6 secciones, empresa-card, 2 scripts nuevos (diagnostico + migración idempotente re-ejecutable).

---
Task ID: 13
Agent: main (Z.ai)
Task: Insertar el listado de upload/productos.csv (694 filas) en la tabla Productos.

Work Log:
- Análisis del CSV con python: 694 filas; idunidad {1:635, 2:27, 3:3, 4:28, 6:1}; iva {0:112, 8:582} (codimpuesto inconsistente en 1 fila, idproducto 347 → se usa la columna iva como autoridad); 12 filas sin familia (NULL/vacía); entidades HTML (&quot; → ", &#39; → ') en 59+ descripciones; sin duplicados del par (referencia, descripción); referencias ≤17 caracteres; precio = costo×(1+margen/100) verificado en todas las filas con costo (solo 1 caso con redondeo de centavo, idproducto 351).
- Creado scripts/importar-productos.ts (bun+Prisma, patrón importar-clientes.ts): parser RFC-4180 propio, decodificador de entidades HTML, limpieza estándar (espacios colapsados + mayúsculas, igual que las validaciones Zod), modo --dry y re-ejecutable (omite pares codigoSat|descripcion existentes).
- Mapeo: referencia→codigoSat (sin espacios internos: "51142110 -00550"→"51142110-00550"); idunidad→{1:PZA, 2:CAJA, 3:RESMA, 4:PAQ, 6:KG}; familia→categoría existente por coincidencia sin acentos (PAPELERIA→PAPELERÍA etc.); observaciones→notas; fechaalta→createdAt (T12:00Z, patrón clientes); actualizado→updatedAt.
- Precio de venta preservado: subtotal = precio del origen; para las 559 filas con costo=0 y precio>0 se derivó costo implícito = redondeo2(precio/(1+margen/100)) — con costo>0 la derivación reproduce el costo original exacto (131/132 idénticas, 1 difiere en derivación pero redondea igual); desviación máxima subtotal-fórmula vs precio: $0.0065. Filas con precio=0 quedan en 0.
- Ejecución: dry-run OK (15 omitidos solo por catálogos pendientes de crear en dry) → import real: 694/694 importados, 0 omitidos. Se crearon unidad RESMA y categoría SIN CATEGORIA (12 filas). BD: 699 productos (694 + 5 demo previos, no tocados).
- Verificación BD (sqlite3): entidades decodificadas, SIN CATEGORIA=12, RESMA=3, tasas iva 0/8 (+16 solo de demo), precios exactos (372.125/100.5075/138.19), 499 con notas/200 sin, createdAt conservado.
- Verificación E2E (agent-browser): Productos "699 productos en total · 699 mostrados"; búsqueda 'CARPETA 1"' encuentra 5 filas con comilla renderizada; sin errores de consola; sin overflow horizontal en 390px; sección Presupuestos carga normal. Capturas: download/productos-importados-escritorio.png, download/productos-importados-movil.png. Lint limpio.

Stage Summary:
- Catálogo real de 694 productos cargado en la tabla Producto; presupuestos ya pueden usarlo (buscador por descripción/código/categoría funciona con el volumen).
- Decisión documentada: los productos sin costo en el origen llevan un costo implícito derivado de precio/(1+margen) para que el SUBTOTAL conserve su precio de venta real; si se prefiere costo=0 con precio $0.00, re-ejecutar variando el script.
- Los 5 productos demo previos y el presupuesto de prueba siguen intactos; se pueden eliminar si se desea limpiar el catálogo.

---
Task ID: 14
Agent: main (Z.ai)
Task: 1) Toasts al centro-centro con fondo #F4711E y texto blanco en bold. 2) Todos los modales a fullwidth.

Work Log:
- Toasts (src/components/ui/toast.tsx, sistema shadcn montado en layout.tsx):
  · ToastViewport: de esquina inferior-derecha a overlay fijo inset-0 con flex items-center justify-center p-4 y pointer-events-none (el toasts individual mantiene pointer-events-auto; verificado con elementFromPoint: el clic fuera del toast llega a la página — desaparece el viejo problema de "toast bloquea clics").
  · Variantes default y destructive unificadas: border-transparent bg-[#F4711E] font-bold text-white. ToastTitle/ToastDescription font-bold text-white; ToastClose blanco (white/80→hover white); ToastAction con borde blanco/50.
  · Ancho del toast limitado a max-w-[min(92vw,520px)] para que centrado no ocupe todo el ancho en escritorio.
- Modales fullwidth: base DialogContent (ui/dialog.tsx) y AlertDialogContent (ui/alert-dialog.tsx): sm:max-w-lg → sm:max-w-[calc(100%-2rem)] (primera prueba con sm:max-w-none quedó pegado a los bordes, sin esquinas visibles; se dejó margen de 1rem por lado). presupuestos-table.tsx: quitado sm:max-w-lg del Dialog de detalle que lo sobreescribía.
- Verificación (agent-browser): toast en 1440×900 se asienta exactamente en y=450/900, x=720/1440 (centro-centro; las lecturas iniciales 461–498 eran la animación de entrada, estabiliza a los 200ms); bg rgb(244,113,30)=#F4711E, color blanco, peso 700. Móvil 390: w=358, centro exacto, sin overflow. AlertDialog de borrado: 1408px en viewport 1440 (gutters 16px); Dialog de detalle de presupuesto: 1408px igual. Sin errores de consola; lint limpio.
- Capturas: download/toast-centro-naranja-escritorio.png, download/toast-centro-naranja-movil.png, download/modal-fullwidth-alertdialog.png, download/modal-fullwidth-presupuesto.png.
- Nota de depuración: el [role=region] de Radix es un div WRAPPER externo (pointerEvents heredado), no el <ol>; el ol real es el ToastViewport con nuestras clases. Duración Radix por defecto 5s. Las referencias de agent-browser quedan obsoletas tras re-renders; usar snapshot fresco antes de click.

Stage Summary:
- Todos los avisos (guardado, errores, eliminaciones) se muestran ahora al centro exacto de la pantalla en naranja #F4711E con texto blanco en negrita, en escritorio y móvil.
- Los 6 diálogos de confirmación de borrado y el visor de presupuesto ocupan todo el ancho (viewport −2rem).
