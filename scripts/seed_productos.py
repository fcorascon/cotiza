#!/usr/bin/env python3
"""Siembra productos de ejemplo en el catálogo, reutilizando los
catálogos existentes de Unidades, Categorías e IVA vía la API REST."""

import json
import urllib.request
import urllib.error

BASE = "http://localhost:3000"


def get_json(path):
    with urllib.request.urlopen(f"{BASE}{path}", timeout=10) as resp:
        return json.loads(resp.read().decode())


def post_json(path, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())


unidades = get_json("/api/unidades")
categorias = get_json("/api/categorias")
ivas = get_json("/api/ivas")
existentes = get_json("/api/productos")

print(f"Catálogos: {len(unidades)} unidades, {len(categorias)} categorías, {len(ivas)} tasas IVA, {len(existentes)} productos existentes")


def buscar_id(lista, campo, valor):
    for item in lista:
        if str(item[campo]).strip().upper() == str(valor).strip().upper():
            return item["id"]
    return None


PRODUCTOS = [
    {
        "codigoSat": "24101702",
        "descripcion": "Papel bond carta 75g",
        "unidad": "PAQ",
        "categoria": "PAPELERÍA",
        "tasa": 16,
        "costo": "45.00",
        "margen": "35",
        "notas": "Paquete de 500 hojas",
    },
    {
        "codigoSat": "25173100",
        "descripcion": "Toner HP 85A negro",
        "unidad": "PZA",
        "categoria": "TINTAS Y TONERS",
        "tasa": 16,
        "costo": "850.00",
        "margen": "25",
        "notas": None,
    },
    {
        "codigoSat": "56101500",
        "descripcion": "Silla ergonómica ejecutiva",
        "unidad": "PZA",
        "categoria": "MOBILIARIO Y EQUIPO",
        "tasa": 16,
        "costo": "3200.00",
        "margen": "40",
        "notas": "Incluye garantía de 2 años",
    },
    {
        "codigoSat": "81101500",
        "descripcion": "Servicio de limpieza integral mensual",
        "unidad": "PZA",
        "categoria": "LIMPIEZA",
        "tasa": 0,
        "costo": "1500.00",
        "margen": "30",
        "notas": "Incluye insumos",
    },
    {
        "codigoSat": "89231700",
        "descripcion": "Café molido de especialidad 1kg",
        "unidad": "KG",
        "categoria": "CAFETERÍA",
        "tasa": 8,
        "costo": "220.00",
        "margen": "45",
        "notas": None,
    },
]

creados = 0
for p in PRODUCTOS:
    if any(
        e["descripcion"].strip().upper() == p["descripcion"].upper()
        for e in existentes
    ):
        print(f"  Ya existe: {p['descripcion']}")
        continue
    payload = {
        "codigoSat": p["codigoSat"],
        "descripcion": p["descripcion"],
        "unidadId": buscar_id(unidades, "unidad", p["unidad"]),
        "categoriaId": buscar_id(categorias, "categoria", p["categoria"]),
        "ivaId": buscar_id(ivas, "tasa", str(p["tasa"])),
        "costo": p["costo"],
        "margen": p["margen"],
        "notas": p["notas"] if p["notas"] else "",
    }
    faltantes = [
        k for k, v in payload.items() if v in (None, "") and k != "notas"
    ]
    if faltantes:
        print(f"  ERROR: {p['descripcion']} — catálogo faltante: {faltantes}")
        continue
    status, data = post_json("/api/productos", payload)
    if status == 201:
        creados += 1
        print(
            f"  Creado ({status}): {data['descripcion']} — subtotal {data['subtotal']}"
        )
    else:
        print(f"  ERROR ({status}): {payload['descripcion']} → {data}")

total = len(get_json("/api/productos"))
print(f"\nSembrados {creados} productos nuevos. Total en catálogo: {total}")
