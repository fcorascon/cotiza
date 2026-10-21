/**
 * Migra los textos existentes de la BD a MAYÚSCULAS, para que la
 * información ya capturada coincida con la nueva regla de captura
 * (todos los campos de texto se convierten a mayúsculas).
 *
 * - Clientes: razonSocial, rfc, calle, numero, colonia, ciudad, estado
 *   (teléfono, C.P. y correo NO se tocan).
 * - Unidades / Categorías: nombre. Si al pasar a mayúsculas dos registros
 *   colisionan (único), se fusionan: los productos pasan al primer registro
 *   y el duplicado se elimina.
 * - Productos: descripcion, codigoSat, notas. También convierte el texto
 *   literal "null" de notas en null real (artefacto de pruebas).
 * - Presupuestos: observaciones y partidas (descripcion, codigoSat, unidad).
 * - Configuración: NO se modifica (los datos de la empresa solo se
 *   convertirán a mayúsculas cuando se vuelvan a guardar).
 *
 * Uso: bun scripts/migrar-mayusculas.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/** Convierte a mayúsculas conservando null y cadenas vacías. */
function aMayusculas(valor: string | null): string | null {
  return valor === null ? null : valor.toUpperCase();
}

async function migrarClientes() {
  const clientes = await db.cliente.findMany();
  let cambiados = 0;
  for (const cliente of clientes) {
    const datos = {
      razonSocial: aMayusculas(cliente.razonSocial),
      rfc: aMayusculas(cliente.rfc),
      calle: aMayusculas(cliente.calle),
      numero: aMayusculas(cliente.numero),
      colonia: aMayusculas(cliente.colonia),
      ciudad: aMayusculas(cliente.ciudad),
      estado: aMayusculas(cliente.estado),
    };
    const hayCambio =
      datos.razonSocial !== cliente.razonSocial ||
      datos.rfc !== cliente.rfc ||
      datos.calle !== cliente.calle ||
      datos.numero !== cliente.numero ||
      datos.colonia !== cliente.colonia ||
      datos.ciudad !== cliente.ciudad ||
      datos.estado !== cliente.estado;
    if (hayCambio) {
      await db.cliente.update({ where: { id: cliente.id }, data: datos });
      cambiados++;
    }
  }
  console.log(`Clientes: ${cambiados} de ${clientes.length} actualizados.`);
}

/**
 * Fusiona colisiones (registros distintos que al pasar a mayúsculas
 * quedan iguales) y devuelve el mapa id → texto en mayúsculas.
 */
async function resolverColisiones(
  modelo: "unidad" | "categoria",
  campo: "unidad" | "categoria"
) {
  const delegado: any =
    modelo === "unidad" ? db.unidad : db.categoria;
  const filas = await delegado.findMany();
  const grupos = new Map<string, typeof filas>();
  for (const fila of filas) {
    const clave = (fila[campo] as string).trim().toUpperCase();
    const lista = grupos.get(clave) ?? [];
    lista.push(fila);
    grupos.set(clave, lista);
  }

  const mapa = new Map<string, string>();
  let fusiones = 0;
  for (const [clave, grupo] of grupos) {
    const [conservado, ...duplicados] = grupo;
    mapa.set(conservado.id, clave);
    for (const duplicado of duplicados) {
      // Reasignar los productos del duplicado al registro conservado.
      await db.producto.updateMany({
        where: { [`${modelo}Id`]: duplicado.id },
        data: { [`${modelo}Id`]: conservado.id },
      });
      await delegado.delete({ where: { id: duplicado.id } });
      fusiones++;
      console.log(
        `⚠ Fusionado en ${modelo}: "${(duplicado as never)[campo]}" → "${clave}"`
      );
    }
  }
  return { mapa, total: filas.length, fusiones };
}

async function migrarCatalogos() {
  for (const modelo of ["unidad", "categoria"] as const) {
    const campo = modelo === "unidad" ? "unidad" : "categoria";
    const { mapa, total, fusiones } = await resolverColisiones(modelo, campo);
    const delegado: any = modelo === "unidad" ? db.unidad : db.categoria;
    let cambiados = 0;
    for (const [id, texto] of mapa) {
      if (texto !== (await delegado.findUnique({ where: { id } }))[campo]) {
        await delegado.update({ where: { id }, data: { [campo]: texto } });
        cambiados++;
      }
    }
    console.log(
      `${modelo === "unidad" ? "Unidades" : "Categorías"}: ${cambiados} de ${total} actualizados (${fusiones} fusiones).`
    );
  }
}

async function migrarProductos() {
  const productos = await db.producto.findMany();
  let cambiados = 0;
  for (const producto of productos) {
    // Limpieza adicional: el texto literal "null" se convierte en null real.
    const notasSucias = producto.notas?.trim().toLowerCase() === "null";
    const datos = {
      descripcion: aMayusculas(producto.descripcion),
      codigoSat: aMayusculas(producto.codigoSat),
      notas: notasSucias ? null : aMayusculas(producto.notas),
    };
    const hayCambio =
      datos.descripcion !== producto.descripcion ||
      datos.codigoSat !== producto.codigoSat ||
      datos.notas !== producto.notas;
    if (hayCambio) {
      await db.producto.update({ where: { id: producto.id }, data: datos });
      cambiados++;
    }
  }
  console.log(`Productos: ${cambiados} de ${productos.length} actualizados.`);
}

async function migrarPresupuestos() {
  const presupuestos = await db.presupuesto.findMany({
    include: { items: true },
  });
  let presupuestosCambiados = 0;
  let itemsCambiados = 0;
  for (const presupuesto of presupuestos) {
    const observaciones = aMayusculas(presupuesto.observaciones);
    if (observaciones !== presupuesto.observaciones) {
      await db.presupuesto.update({
        where: { id: presupuesto.id },
        data: { observaciones },
      });
      presupuestosCambiados++;
    }
    for (const item of presupuesto.items) {
      const datos = {
        descripcion: aMayusculas(item.descripcion),
        codigoSat: aMayusculas(item.codigoSat),
        unidad: aMayusculas(item.unidad),
      };
      const hayCambio =
        datos.descripcion !== item.descripcion ||
        datos.codigoSat !== item.codigoSat ||
        datos.unidad !== item.unidad;
      if (hayCambio) {
        await db.presupuestoItem.update({
          where: { id: item.id },
          data: datos,
        });
        itemsCambiados++;
      }
    }
  }
  console.log(
    `Presupuestos: ${presupuestosCambiados} con observaciones actualizadas; partidas: ${itemsCambiados}.`
  );
}

async function main() {
  console.log("── Migración de textos existentes a MAYÚSCULAS ──");
  await migrarClientes();
  await migrarCatalogos();
  await migrarProductos();
  await migrarPresupuestos();
  console.log("── Migración terminada ──");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
