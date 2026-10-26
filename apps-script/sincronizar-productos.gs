/**
 * ─────────────────────────────────────────────────────────────────────
 *  Apps Script de sincronización (app ← hoja / app → hoja)
 *
 *  Este proyecto ya importa el catálogo leyendo el CSV público de la
 *  hoja (pestaña "productos"), así que la lectura no necesita este
 *  script. Lo que sí requiere este script es la ESCRITURA: permitir
 *  que la app envíe sus productos hacia la hoja.
 *
 *  INSTALACIÓN
 *  1. Abre la hoja de datos → Extensiones → Apps Script.
 *  2. Borra el contenido del editor, pega TODO este archivo y guarda.
 *  3. Implementar → Nueva implementación → tipo "Aplicación web".
 *       Descripción:     Presupuestos (sync)
 *       Ejecutar como:   Yo
 *       Quién accede:    Cualquier persona
 *  4. Autoriza los permisos que pide Google.
 *  5. Copia la URL que termina en /exec   ←  esa es la "App Script URL"
 *     que va en la tarjeta de Google Sheets de la aplicación.
 * ─────────────────────────────────────────────────────────────────────
 */

/** Nombres de pestañas donde se trabaja. */
const HOJA_PRODUCTOS = "productos";
const HOJA_UNIDADES = "unidades";
const HOJA_FAMILIAS = "familias";
const HOJA_IMPUESTOS = "impuestos";

/** Equivalencias entre unidades de la app y la hoja (igual que la app). */
const EQUIVALENCIAS_UNIDAD = {
  CJA: "CAJA", CAJA: "CAJA",
  MIL: "MILLAR", MILLAR: "MILLAR",
  PZA: "PZA", PIEZA: "PZA",
  PAQ: "PAQ", PAQUETE: "PAQ",
  KG: "KG", KGS: "KG", KILO: "KG", KILOS: "KG",
  LT: "LT", L: "LT", LITRO: "LT", LITROS: "LT",
};

/** Clave de comparación: mayúsculas, sin acentos y espacios simples. */
function clave(valor) {
  return String(valor == null ? "" : valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/** Unidad de la app (ya normalizada) → nombre de la hoja equivalente. */
function nombreUnidadHoja(unidadApp) {
  const claveApp = clave(unidadApp);
  if (!claveApp) return "";
  for (const [claveHoja, nombreApp] of Object.entries(EQUIVALENCIAS_UNIDAD)) {
    if (nombreApp === claveApp) return claveHoja;
  }
  return claveApp;
}

function numero(valor) {
  var n = parseFloat(String(valor == null ? "" : valor).replace(",", "."));
  return isFinite(n) ? n : null;
}

/** Respuesta JSON uniforme. */
function json(objeto) {
  return ContentService.createTextOutput(
    JSON.stringify(objeto)
  ).setMimeType(ContentService.MimeType.JSON);
}

/** Prueba rápida desde el navegador: la URL ?ping debería decir ok. */
function doGet() {
  return json({ ok: true, mensaje: "Apps Script de presupuestos activo" });
}

/* ────────────────────────── Principal ────────────────────────── */

function doPost(e) {
  var carga;
  try {
    carga = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  } catch (_e) {
    return json({ ok: false, error: "Cuerpo no es JSON válido." });
  }
  if (carga.action === "sync" && Array.isArray(carga.productos)) {
    return json(sincronizarProductos(carga.productos));
  }
  return json({ ok: false, error: "Acción no reconocida." });
}

/**
 * Recibe los productos de la app y los escribe en la pestaña
 * "productos": filas nuevas se agregan, las existentes se actualizan
 * solo en (iva, costo, margen, precio, observaciones) si cambiaron.
 * Nunca elimina ni renombra filas de la hoja.
 */
function sincronizarProductos(productos) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hojaProd = ss.getSheetByName(HOJA_PRODUCTOS);
  if (!hojaProd) {
    return { ok: false, error: 'No existe la pestaña "' + HOJA_PRODUCTOS + '".' };
  }

  var ultimaFilaProd = hojaProd.getLastRow();
  if (ultimaFilaProd < 1) {
    return { ok: false, error: "La pestaña productos está vacía." };
  }
  var rango = hojaProd.getRange(1, 1, ultimaFilaProd, hojaProd.getLastColumn());
  var datos = rango.getValues();
  var encabezados = datos[0].map(function (c) {
    return clave(c);
  });
  var indice = {};
  encabezados.forEach(function (enc, i) {
    if (!(enc in indice)) indice[enc] = i;
  });
  var COL = {
    idproducto: indice["IDPRODUCTO"],
    referencia: indice["REFERENCIA"],
    descripcion: indice["DESCRIPCION"],
    idunidad: indice["IDUNIDAD"],
    familia: indice["FAMILIA"],
    codfamilia: indice["CODFAMILIA"],
    codimpuesto: indice["CODIMPUESTO"],
    iva: indice["IVA"],
    precio: indice["PRECIO"],
    costo: indice["COSTO"],
    margen: indice["MARGEN"],
    tipo: indice["TIPO"],
    observaciones: indice["OBSERVACIONES"],
    fechaalta: indice["FECHAALTA"],
    actualizado: indice["ACTUALIZADO"],
  };
  if (COL.descripcion == null) {
    return { ok: false, error: 'Falta la columna "descripcion".' };
  }

  var mapaUnidades = leerUnidades(ss);
  var mapaFamilias = leerFamilias(ss);
  var mapaImpuestos = leerImpuestos(ss);

  var hoy = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() || "GMT-6",
    "yyyy-MM-dd"
  );

  // Mapa de filas existentes por descripción (sin acentos, mayúsculas).
  var filasPorClave = {};
  var filasCambiadas = [];  // {fila: number, datos: []}
  for (var i = 1; i < datos.length; i++) {
    var nombre = String(datos[i][COL.descripcion] || "").trim();
    if (!nombre) continue;
    var claveFila = clave(nombre);
    if (filasPorClave[claveFila] == null) {
      filasPorClave[claveFila] = i;  // primera ocurrencia gana
    }
  }

  var siguientesId = siguienteNumerico(datos, COL.idproducto);
  var siguienteIdUnidad = siguienteIdNumericoDeUnidades(mapaUnidades);
  var filasNuevas = [];
  var errores = [];
  var creados = 0,
    actualizados = 0,
    sinCambios = 0,
    omitidos = 0;

  productos.forEach(function (p, ip) {
    var k = p.clave || clave(p.descripcion);
    if (!k) {
      errores.push({ fila: ip + 2, mensaje: "Producto sin descripción." });
      return;
    }
    var filaIdx = filasPorClave[k];
    if (filaIdx === -2) {
      omitidos++;  // duplicado dentro del mismo envío
      errores.push({
        fila: ip + 2,
        mensaje: "Descripción repetida en el envío; se omitió.",
      });
      return;
    }
    if (filaIdx != null) {
      var cambiado = false,
        fila = datos[filaIdx];

      function campo(col, valorNuevo, comparar) {
        if (col == null || col < 0) return;
        var actual = fila[col];
        var iguales = comparar
          ? comparar(actual, valorNuevo)
          : String(actual).trim() === String(valorNuevo).trim();
        if (!iguales) {
          fila[col] = valorNuevo;
          cambiado = true;
        }
      }
      var mismaCantidad = function (a, b) {
        var na = numero(a),
          nb = numero(b);
        return na !== null && nb !== null ? Math.abs(na - nb) < 0.0001 : String(a).trim() === String(b).trim();
      };

      campo(COL.iva, p.iva, mismaCantidad);
      campo(COL.costo, p.costo, mismaCantidad);
      campo(COL.margen, p.margen, mismaCantidad);
      campo(COL.precio, p.subtotal, mismaCantidad);
      campo(COL.observaciones, p.notas || "");

      if (cambiado) {
        if (COL.actualizado != null) fila[COL.actualizado] = hoy;
        filasCambiadas.push({ fila: filaIdx, datos: fila });
        actualizados++;
      } else {
        sinCambios++;
      }
    } else {
      var idunidad = "";
      var unidadHoja = nombreUnidadHoja(p.unidad);
      if (unidadHoja) {
        var unidadHallada = mapaUnidades[clave(unidadHoja)];
        if (unidadHallada != null) {
          idunidad = unidadHallada.id;
        } else {
          idunidad = siguienteIdUnidad++;
          nuevaUnidad(ss, unidadHoja, idunidad);
          mapaUnidades[clave(unidadHoja)] = { id: idunidad, nombre: unidadHoja };
        }
      }
      var familia = p.categoria || "";
      var codfamilia = mapaFamilias[clave(familia)];
      if (codfamilia == null && familia) {
        codfamilia = siguienteCodFamilia(ss, mapaFamilias);
        nuevaFamilia(ss, familia, codfamilia);
        mapaFamilias[clave(familia)] = codfamilia;
      }
      var codimpuesto = mapaImpuestos[numero(p.iva)];
      if (codimpuesto == null) {
        codimpuesto = "";
      }

      var filaNueva = [];
      var total = encabezados.length;
      for (var c = 0; c < total; c++) filaNueva.push("");
      if (COL.idproducto != null) filaNueva[COL.idproducto] = siguientesId++;
      if (COL.referencia != null) filaNueva[COL.referencia] = "";
      filaNueva[COL.descripcion] = p.descripcion;
      if (COL.idunidad != null) filaNueva[COL.idunidad] = idunidad;
      if (COL.familia != null) filaNueva[COL.familia] = familia;
      if (COL.codfamilia != null) filaNueva[COL.codfamilia] = codfamilia;
      if (COL.codimpuesto != null) filaNueva[COL.codimpuesto] = codimpuesto;
      if (COL.iva != null) filaNueva[COL.iva] = p.iva;
      if (COL.precio != null) filaNueva[COL.precio] = p.subtotal;
      if (COL.costo != null) filaNueva[COL.costo] = p.costo;
      if (COL.margen != null) filaNueva[COL.margen] = p.margen;
      if (COL.tipo != null) filaNueva[COL.tipo] = "";
      if (COL.observaciones != null) filaNueva[COL.observaciones] = p.notas || "";
      if (COL.fechaalta != null) filaNueva[COL.fechaalta] = hoy;
      if (COL.actualizado != null) filaNueva[COL.actualizado] = hoy;

      filasNuevas.push(filaNueva);
      filasPorClave[k] = -2;  // marcado como "recién creado"
      creados++;
    }
  });

  // Escribir cambios en lotes.
  filasCambiadas.forEach(function (cambio) {
    hojaProd
      .getRange(cambio.fila + 1, 1, 1, cambio.datos.length)
      .setValues([cambio.datos]);
  });
  if (filasNuevas.length > 0 && encabezados.length > 0) {
    hojaProd
      .getRange(ultimaFilaProd + 1, 1, filasNuevas.length, encabezados.length)
      .setValues(filasNuevas);
  }

  return {
    ok: true,
    creados: creados,
    actualizados: actualizados,
    sinCambios: sinCambios,
    omitidos: omitidos,
    errores: errores.length,
    erroresDetalle: errores.slice(0, 20),
  };
}

function siguienteNumerico(datos, columna, porDefecto) {
  var maximo = 0;
  if (datos && columna != null) {
    for (var i = 1; i < datos.length; i++) {
      var n = numero(datos[i][columna]);
      if (n != null && n > maximo) maximo = n;
    }
    return maximo + 1;
  }
  return porDefecto || 1;
}

/** Siguiente idunidad a partir de un mapa de unidades cargado. */
function siguienteIdNumericoDeUnidades(mapaUnidades) {
  var maximo = 0;
  Object.keys(mapaUnidades).forEach(function (k) {
    var n = numero(mapaUnidades[k].id);
    if (n != null && n > maximo) maximo = n;
  });
  return maximo + 1;
}

/* ── Catálogo de unidades (idunidad / unidad) ── */
function leerUnidades(ss) {
  var mapa = {};
  var hoja = ss.getSheetByName(HOJA_UNIDADES);
  if (!hoja || hoja.getLastRow() < 1) return mapa;
  var datos = hoja.getRange(1, 1, hoja.getLastRow(), hoja.getLastColumn()).getValues();
  var encabezados = datos[0].map(function (c) {
    return clave(c);
  });
  var iId = encabezados.indexOf("IDUNIDAD");
  var iNombre = encabezados.indexOf("UNIDAD");
  if (iNombre < 0) iNombre = encabezados.indexOf("DESCRIPCION");
  if (iId < 0 || iNombre < 0) return mapa;
  for (var i = 1; i < datos.length; i++) {
    var nombre = String(datos[i][iNombre] || "").trim();
    var id = String(datos[i][iId] || "").trim();
    if (!nombre) continue;
    mapa[clave(nombre)] = { id: id, nombre: nombre };
  }
  return mapa;
}

function nuevaUnidad(ss, nombre, id) {
  var hoja = ss.getSheetByName(HOJA_UNIDADES);
  if (!hoja) return;
  hoja.appendRow([id, nombre]);
}

/* ── Catálogo de familias (codfamilia / descripcion) ── */
function leerFamilias(ss) {
  var mapa = {};
  var hoja = ss.getSheetByName(HOJA_FAMILIAS);
  if (!hoja || hoja.getLastRow() < 1) return mapa;
  var datos = hoja.getRange(1, 1, hoja.getLastRow(), hoja.getLastColumn()).getValues();
  var encabezados = datos[0].map(function (c) {
    return clave(c);
  });
  var iCode = encabezados.indexOf("CODFAMILIA");
  var iNombre = encabezados.indexOf("DESCRIPCION");
  if (iNombre < 0) iNombre = encabezados.indexOf("FAMILIA");
  if (iCode < 0 || iNombre < 0) return mapa;
  for (var i = 1; i < datos.length; i++) {
    var nombre = String(datos[i][iNombre] || "").trim();
    if (!nombre) continue;
    mapa[clave(nombre)] = String(datos[i][iCode] || "").trim();
  }
  return mapa;
}

function siguienteCodFamilia(ss, mapaFamilias) {
  var maximo = 0;
  Object.keys(mapaFamilias).forEach(function (k) {
    var n = numero(mapaFamilias[k]);
    if (n != null && n > maximo) maximo = n;
  });
  return maximo + 1;
}

function nuevaFamilia(ss, nombre, codfamilia) {
  var hoja = ss.getSheetByName(HOJA_FAMILIAS);
  if (!hoja) return;
  hoja.appendRow([codfamilia, nombre]);
}

/* ── Catálogo de impuestos (codimpuesto / iva) ── */
function leerImpuestos(ss) {
  var mapa = {};
  var hoja = ss.getSheetByName(HOJA_IMPUESTOS);
  if (!hoja || hoja.getLastRow() < 1) return mapa;
  var datos = hoja.getRange(1, 1, hoja.getLastRow(), hoja.getLastColumn()).getValues();
  var encabezados = datos[0].map(function (c) {
    return clave(c);
  });
  var iCode = encabezados.indexOf("CODIMPUESTO");
  var iTasa = encabezados.indexOf("IVA");
  if (iCode < 0 || iTasa < 0) return mapa;
  for (var i = 1; i < datos.length; i++) {
    var tasa = numero(datos[i][iTasa]);
    if (tasa == null) continue;
    mapa[tasa] = String(datos[i][iCode] || "").trim();
  }
  return mapa;
}
