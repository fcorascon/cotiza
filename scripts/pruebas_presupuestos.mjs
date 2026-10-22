/**
 * Pruebas API de la sección Presupuestos.
 * Escenarios: GET vacío, POST con totales calculados en servidor,
 * validaciones (400), cliente inexistente, PUT con reemplazo de partidas,
 * DELETE, y protección de cliente en uso (409).
 */
const BASE = "http://localhost:3000";

async function main() {
  console.log("— GET /api/presupuestos (inicial)");
  const listaInicial = await fetch(`${BASE}/api/presupuestos`).then((r) => r.json());
  console.log("   presupuestos actuales:", listaInicial.length);

  // Datos base
  const clientes = await fetch(`${BASE}/api/clientes`).then((r) => r.json());
  const productos = await fetch(`${BASE}/api/productos`).then((r) => r.json());
  if (clientes.length < 1 || productos.length < 2) {
    throw new Error("Se requieren al menos 1 cliente y 2 productos sembrados");
  }
  const cliente = clientes[0];
  const prodA = productos.find((p) => p.iva.tasa === 16) ?? productos[0];
  const prodB = productos.find((p) => p.iva.tasa === 0 && p.id !== prodA.id) ?? productos[1];
  console.log(
    `   usando cliente "${cliente.razonSocial}" · A="${prodA.descripcion}" (${prodA.iva.tasa}%, ${prodA.subtotal}) · B="${prodB.descripcion}" (${prodB.iva.tasa}%, ${prodB.subtotal})`
  );

  console.log("— POST vacío (debe dar 400 con fieldErrors)");
  let res = await fetch(`${BASE}/api/presupuestos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  let data = await res.json();
  console.log("   estado:", res.status, "· fieldErrors:", JSON.stringify(data.fieldErrors));

  console.log("— POST sin partidas (debe dar 400)");
  res = await fetch(`${BASE}/api/presupuestos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clienteId: cliente.id, fecha: "2026-10-22", items: [] }),
  });
  data = await res.json();
  console.log("   estado:", res.status, "· fieldErrors:", JSON.stringify(data.fieldErrors));

  console.log("— POST cliente inexistente (debe dar 400)");
  res = await fetch(`${BASE}/api/presupuestos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clienteId: "no-existe",
      fecha: "2026-10-22",
      items: [{ productoId: prodA.id, descripcion: "X", cantidad: 1, precioUnitario: 10, ivaTasa: 16 }],
    }),
  });
  data = await res.json();
  console.log("   estado:", res.status, "· fieldErrors:", JSON.stringify(data.fieldErrors));

  // Cálculo esperado: A cantidad 2 (precio pA.subtotal, IVA 16%) + B cantidad 3 (IVA 0%)
  const importeA = Math.round(prodA.subtotal * 2 * 100) / 100;
  const importeB = Math.round(prodB.subtotal * 3 * 100) / 100;
  const ivaA = Math.round(importeA * 0.16 * 100) / 100;
  const esperado = {
    subtotal: Math.round((importeA + importeB) * 100) / 100,
    iva: ivaA,
    total: Math.round((importeA + importeB + ivaA) * 100) / 100,
  };
  console.log(
    `— POST válido: A×2 (${importeA} + IVA16 ${ivaA}) + B×3 (${importeB}) → esperado sub ${esperado.subtotal}, iva ${esperado.iva}, total ${esperado.total}`
  );
  res = await fetch(`${BASE}/api/presupuestos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clienteId: cliente.id,
      fecha: "2026-10-22",
      observaciones: "Prueba automática de presupuestos",
      items: [
        { productoId: prodA.id, descripcion: prodA.descripcion, codigoSat: prodA.codigoSat, unidad: prodA.unidad.unidad, cantidad: 2, precioUnitario: prodA.subtotal, ivaTasa: prodA.iva.tasa },
        { productoId: prodB.id, descripcion: prodB.descripcion, codigoSat: prodB.codigoSat, unidad: prodB.unidad.unidad, cantidad: 3, precioUnitario: prodB.subtotal, ivaTasa: prodB.iva.tasa },
      ],
    }),
  });
  data = await res.json();
  console.log("   estado:", res.status, "· sub/iva/total:", data.subtotal, data.iva, data.total);
  const okTotales =
    Math.abs(data.subtotal - esperado.subtotal) < 0.005 &&
    Math.abs(data.iva - esperado.iva) < 0.005 &&
    Math.abs(data.total - esperado.total) < 0.005;
  console.log("   totales correctos:", okTotales ? "SÍ" : "NO ← REVISAR");
  const idPresupuesto = data.id;

  console.log("— PUT: cambio de fecha/observaciones y cantidad A 2→5");
  const importeA5 = Math.round(prodA.subtotal * 5 * 100) / 100;
  const ivaA5 = Math.round(importeA5 * 0.16 * 100) / 100;
  res = await fetch(`${BASE}/api/presupuestos/${idPresupuesto}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clienteId: cliente.id,
      fecha: "2026-10-21",
      observaciones: "Editado por prueba automática",
      items: [
        { productoId: prodA.id, descripcion: prodA.descripcion, codigoSat: prodA.codigoSat, unidad: prodA.unidad.unidad, cantidad: 5, precioUnitario: prodA.subtotal, ivaTasa: prodA.iva.tasa },
        { productoId: prodB.id, descripcion: prodB.descripcion, codigoSat: prodB.codigoSat, unidad: prodB.unidad.unidad, cantidad: 3, precioUnitario: prodB.subtotal, ivaTasa: prodB.iva.tasa },
      ],
    }),
  });
  data = await res.json();
  console.log(
    "   estado:", res.status,
    "· partidas:", data.items?.length,
    "· sub/iva/total:", data.subtotal, data.iva, data.total,
    "· esperado:", Math.round((importeA5 + importeB) * 100) / 100, ivaA5, Math.round((importeA5 + importeB + ivaA5) * 100) / 100
  );

  console.log("— PUT inexistente (debe dar 404)");
  res = await fetch(`${BASE}/api/presupuestos/no-existe`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: "{}" });
  console.log("   estado:", res.status);

  console.log("— GET /api/presupuestos/[id]");
  res = await fetch(`${BASE}/api/presupuestos/${idPresupuesto}`);
  data = await res.json();
  console.log("   estado:", res.status, "· cliente:", data.cliente?.razonSocial, "· partidas:", data.items?.length);

  console.log("— DELETE cliente en uso (debe dar 409 P2003)");
  res = await fetch(`${BASE}/api/clientes/${cliente.id}`, { method: "DELETE" });
  data = await res.json();
  console.log("   estado:", res.status, "· error:", data.error);

  console.log("— DELETE presupuesto de prueba");
  res = await fetch(`${BASE}/api/presupuestos/${idPresupuesto}`, { method: "DELETE" });
  console.log("   estado:", res.status);

  console.log("— GET final (debe volver a", listaInicial.length, ")");
  data = await fetch(`${BASE}/api/presupuestos`).then((r) => r.json());
  console.log("   presupuestos:", data.length);
}

main().catch((error) => {
  console.error("FALLO EN PRUEBAS:", error);
  process.exit(1);
});
