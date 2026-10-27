/** DDL generado automáticamente con prisma migrate diff (idempotente). NO EDITAR. */
export const DDL = `-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE IF NOT EXISTS "Cliente" (
    "id" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "rfc" TEXT NOT NULL,
    "calle" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "colonia" TEXT NOT NULL,
    "codigoPostal" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Unidad" (
    "id" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Categoria" (
    "id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Iva" (
    "id" TEXT NOT NULL,
    "tasa" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Iva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Producto" (
    "id" TEXT NOT NULL,
    "codigoSat" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "ivaId" TEXT NOT NULL,
    "costo" DOUBLE PRECISION NOT NULL,
    "margen" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Presupuesto" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "observaciones" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "iva" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PresupuestoItem" (
    "id" TEXT NOT NULL,
    "presupuestoId" TEXT NOT NULL,
    "productoId" TEXT,
    "descripcion" TEXT NOT NULL,
    "codigoSat" TEXT,
    "unidad" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "importe" DOUBLE PRECISION NOT NULL,
    "ivaTasa" DOUBLE PRECISION NOT NULL,
    "ivaImporte" DOUBLE PRECISION NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "PresupuestoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Usuario" (
    "id" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'USUARIO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Configuracion" (
    "id" TEXT NOT NULL DEFAULT 'principal',
    "nombreComercial" TEXT NOT NULL,
    "razonLegal" TEXT NOT NULL,
    "rfc" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "logo" TEXT,
    "smtpHost" TEXT NOT NULL DEFAULT '',
    "smtpPuerto" INTEGER NOT NULL DEFAULT 587,
    "smtpCifrado" TEXT NOT NULL DEFAULT 'SSL',
    "smtpUsuario" TEXT NOT NULL DEFAULT '',
    "smtpPassword" TEXT NOT NULL DEFAULT '',
    "presupuestoColor" TEXT NOT NULL DEFAULT '#1D4ED8',
    "presupuestoFila" TEXT NOT NULL DEFAULT 'normal',
    "presupuestoLogo" TEXT,
    "reciboColor" TEXT NOT NULL DEFAULT '#1D4ED8',
    "reciboFila" TEXT NOT NULL DEFAULT 'grande',
    "reciboLogo" TEXT,
    "colorPrimario" TEXT NOT NULL DEFAULT '#191970',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EnvioCorreo" (
    "id" TEXT NOT NULL,
    "presupuestoId" TEXT,
    "destino" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ENVIADO',
    "error" TEXT,
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnvioCorreo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IntegracionSheets" (
    "id" TEXT NOT NULL DEFAULT 'principal',
    "url" TEXT NOT NULL DEFAULT '',
    "gid" TEXT NOT NULL DEFAULT '',
    "appsScriptUrl" TEXT NOT NULL DEFAULT '',
    "ultimaImportacion" TIMESTAMP(3),
    "ultimoResumen" TEXT,
    "ultimoEnvio" TIMESTAMP(3),
    "ultimoResumenEnvio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegracionSheets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Cliente_razonSocial_idx" ON "Cliente"("razonSocial");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Cliente_rfc_idx" ON "Cliente"("rfc");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Unidad_unidad_key" ON "Unidad"("unidad");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Categoria_categoria_key" ON "Categoria"("categoria");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Iva_tasa_key" ON "Iva"("tasa");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Producto_descripcion_idx" ON "Producto"("descripcion");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Producto_codigoSat_idx" ON "Producto"("codigoSat");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Presupuesto_clienteId_idx" ON "Presupuesto"("clienteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Presupuesto_fecha_idx" ON "Presupuesto"("fecha");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PresupuestoItem_presupuestoId_idx" ON "PresupuestoItem"("presupuestoId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_usuario_key" ON "Usuario"("usuario");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EnvioCorreo_presupuestoId_idx" ON "EnvioCorreo"("presupuestoId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EnvioCorreo_createdAt_idx" ON "EnvioCorreo"("createdAt");

-- AddForeignKey
ALTER TABLE IF NOT EXISTS "Producto" ADD CONSTRAINT IF NOT EXISTS "Producto_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF NOT EXISTS "Producto" ADD CONSTRAINT IF NOT EXISTS "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF NOT EXISTS "Producto" ADD CONSTRAINT IF NOT EXISTS "Producto_ivaId_fkey" FOREIGN KEY ("ivaId") REFERENCES "Iva"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF NOT EXISTS "Presupuesto" ADD CONSTRAINT IF NOT EXISTS "Presupuesto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF NOT EXISTS "PresupuestoItem" ADD CONSTRAINT IF NOT EXISTS "PresupuestoItem_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF NOT EXISTS "PresupuestoItem" ADD CONSTRAINT IF NOT EXISTS "PresupuestoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF NOT EXISTS "EnvioCorreo" ADD CONSTRAINT IF NOT EXISTS "EnvioCorreo_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

`;
