#!/usr/bin/env python3
"""Re-pruebas de formatos tolerantes y restauración de datos."""

import json
import urllib.request
import urllib.error

BASE = "http://localhost:3000/api"


def get_json(path):
    with urllib.request.urlopen(f"{BASE}{path}", timeout=10) as resp:
        return json.loads(resp.read().decode())


def request(path, method, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        headers={"Content-Type": "application/json"} if data else {},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return e.code, json.loads(body)
        except json.JSONDecodeError:
            return e.code, {"raw": body}


unidades = get_json("/unidades")
categorias = get_json("/categorias")
ivas = get_json("/ivas")
PZA = [u for u in unidades if u["unidad"] == "PZA"][0]["id"]
KG = [u for u in unidades if u["unidad"] == "KG"][0]["id"]
CAT = categorias[0]["id"]
CAF = [c for c in categorias if c["categoria"] == "CAFETERÍA"][0]["id"]
IVA16 = [i for i in ivas if i["tasa"] == 16][0]["id"]

print("=== Re-test 1: costo '$1,234.50' y margen '10 %' → 201 ===")
status, d = request("/productos", "POST", {
    "codigoSat": "88888888",
    "descripcion": "Producto temporal formato moneda",
    "unidadId": PZA, "categoriaId": CAT, "ivaId": IVA16,
    "costo": "$1,234.50", "margen": "10 %",
})
print(f"HTTP {status} | costo={d.get('costo')} | margen={d.get('margen')} | subtotal={d.get('subtotal')}")
assert status == 201 and d["costo"] == 1234.50 and d["margen"] == 10 and d["subtotal"] == 1357.95
PID = d["id"]

print("=== Re-test 2: margen límite '999' → 201 con subtotal 109.9 (10 × (1+999/100)) ===")
status, d2 = request("/productos", "POST", {
    "codigoSat": "77777777",
    "descripcion": "Producto temporal margen límite",
    "unidadId": PZA, "categoriaId": CAT, "ivaId": IVA16,
    "costo": "10", "margen": "999",
})
print(f"HTTP {status} | subtotal={d2.get('subtotal')}")
assert status == 201 and d2["subtotal"] == 109.9
PID2 = d2["id"]

print("=== Limpieza de temporales (todas las coincidencias) ===")
eliminados = 0
for p in get_json("/productos"):
    if p["descripcion"].startswith("Producto temporal"):
        print(f"DELETE {p['descripcion']} →", request(f"/productos/{p['id']}", "DELETE")[0])
        eliminados += 1
print(f"Eliminados {eliminados} temporales")

print("=== Restaurar 'Café molido' a CAFETERÍA, notas vacías ===")
productos = get_json("/productos")
cafe = [p for p in productos if p["descripcion"] == "Café molido de especialidad 1kg"][0]
status, d3 = request(f"/productos/{cafe['id']}", "PUT", {
    "codigoSat": "89231700",
    "descripcion": "Café molido de especialidad 1kg",
    "unidadId": KG, "categoriaId": CAF, "ivaId": IVA16,
    "costo": "220.00", "margen": "50", "notas": "",
})
print(f"HTTP {status} | categoria={d3['categoria']['categoria']} | notas={d3['notas']} | subtotal={d3['subtotal']}")
assert status == 200 and d3["categoria"]["categoria"] == "CAFETERÍA" and d3["notas"] is None

print("\n=== Catálogo final ===")
for p in get_json("/productos"):
    print(f"  {p['descripcion']} | {p['codigoSat']} | {p['unidad']['unidad']} | "
          f"{p['categoria']['categoria']} | IVA {p['iva']['tasa']}% | "
          f"costo {p['costo']} | margen {p['margen']}% | subtotal {p['subtotal']}")
print("OK: todas las re-pruebas pasaron")
