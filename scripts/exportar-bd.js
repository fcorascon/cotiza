/**
 * Exporta todos los registros de la base local (SQLite) a JSON,
 * para insertarlos luego en la base de nube (Neon/Postgres).
 *
 * Uso: node scripts/exportar-bd.js [archivo.json]
 */
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient({
  log: [{ emit: "stdout", level: "warn" }],
});

async function main() {
  const [usuarios, clientes, unidades, ivas, categorias, productos, configuracion, presupuestos, presupuestosItems, enviosCorreo, integracionSheets] =
    await Promise.all([
      prisma.usuario.findMany(),
      prisma.cliente.findMany(),
      prisma.unidad.findMany(),
      prisma.iva.findMany(),
      prisma.categoria.findMany(),
      prisma.producto.findMany(),
      prisma.configuracion.findMany(),
      prisma.presupuesto.findMany(),
      prisma.presupuestoItem.findMany(),
      prisma.envioCorreo.findMany(),
      prisma.integracionSheets.findMany(),
    ]);

  const datos = {
    usuarios,
    clientes,
    unidades,
    ivas,
    categorias,
    productos,
    configuracion,
    presupuestos,
    presupuestosItems,
    enviosCorreo,
    integracionSheets,
  };
  // EnvioCorreo puede tener messageId/causa opcionales; van tal cual.

  const destino =
    process.argv[2] || path.join(__dirname, "..", "bd-migrada.json");
  fs.writeFileSync(destino, JSON.stringify(datos, null, 1));

  const resumen = {};
  for (const [clave, lista] of Object.entries(datos)) resumen[clave] = lista.length;
  console.log(JSON.stringify(resumen, null, 2));
  console.log("Guardado en", destino);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
