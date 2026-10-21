/**
 * Diagnóstico: detecta posibles colisiones de mayúsculas/minúsculas
 * en campos únicos (Unidad.unidad, Categoria.categoria) antes de
 * migrar los textos existentes a MAYÚSCULAS.
 * Uso: bun scripts/diagnostico-mayusculas.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const unidades = await db.unidad.findMany({
    select: { id: true, unidad: true },
  });
  const categorias = await db.categoria.findMany({
    select: { id: true, categoria: true },
  });

  console.log(`Unidades: ${unidades.length} | Categorías: ${categorias.length}`);

  for (const [nombre, filas] of [
    ["unidad", unidades.map((u) => ({ id: u.id, texto: u.unidad }))],
    ["categoria", categorias.map((c) => ({ id: c.id, texto: c.categoria }))],
  ] as const) {
    const mapa = new Map<string, string[]>();
    for (const fila of filas) {
      const clave = fila.texto.trim().toUpperCase();
      const lista = mapa.get(clave) ?? [];
      lista.push(fila.texto);
      mapa.set(clave, lista);
    }
    for (const [clave, variantes] of mapa) {
      if (variantes.length > 1) {
        console.log(`⚠ COLISIÓN en ${nombre}: "${clave}" ← ${JSON.stringify(variantes)}`);
      }
    }
  }

  const [clientes, productos, presupuestos, items, config] = await Promise.all([
    db.cliente.count(),
    db.producto.count(),
    db.presupuesto.count(),
    db.presupuestoItem.count(),
    db.configuracion.count(),
  ]);
  console.log(
    `Clientes: ${clientes} | Productos: ${productos} | Presupuestos: ${presupuestos} | Partidas: ${items} | Configuraciones: ${config}`
  );

  // Muestra registros con minúsculas para confirmar que la migración es necesaria.
  const clienteMuestra = await db.cliente.findMany({ take: 3, orderBy: { createdAt: "asc" } });
  for (const c of clienteMuestra) {
    console.log(`Muestra cliente: razonSocial="${c.razonSocial}" ciudad="${c.ciudad}"`);
  }
  const productoMuestra = await db.producto.findMany({ take: 3 });
  for (const p of productoMuestra) {
    console.log(`Muestra producto: descripcion="${p.descripcion}" notas="${p.notas}"`);
  }
  const unidadMuestra = await db.unidad.findMany({ take: 5 });
  for (const u of unidadMuestra) {
    console.log(`Muestra unidad: "${u.unidad}"`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
