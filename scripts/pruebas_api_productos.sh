#!/bin/bash
# Pruebas de API para la sección Productos
cd /home/z/my-project
BASE=http://localhost:3000/api

echo "=== 1. POST inválido (descripción corta, costo no numérico, sin selección) → 400 ==="
curl -s -w "\nHTTP:%{http_code}\n" -X POST $BASE/productos -H "Content-Type: application/json" -d '{"codigoSat":"A","descripcion":"ab","unidadId":"","categoriaId":"","ivaId":"","costo":"abc","margen":"","notas":""}'

echo "=== 2. POST con relación inexistente (unidadId=fantasma) → 400 con fieldErrors ==="
CAT=$(curl -s $BASE/categorias | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
IVA=$(curl -s $BASE/ivas | python3 -c "import sys,json; d=json.load(sys.stdin); print([x for x in d if x['tasa']==16][0]['id'])")
curl -s -w "\nHTTP:%{http_code}\n" -X POST $BASE/productos -H "Content-Type: application/json" -d "{\"codigoSat\":\"12345678\",\"descripcion\":\"Producto fantasma de prueba\",\"unidadId\":\"NOEXISTE\",\"categoriaId\":\"$CAT\",\"ivaId\":\"$IVA\",\"costo\":\"100\",\"margen\":\"10\"}"

echo "=== 3. PUT sobre producto inexistente → 404 ==="
curl -s -w "\nHTTP:%{http_code}\n" -X PUT $BASE/productos/ID_INEXISTENTE -H "Content-Type: application/json" -d '{}'

echo "=== 4. PUT real: cambiar margen de 'Café molido' 45→50 y verificar recálculo (319→330) ==="
PROD_ID=$(curl -s "$BASE/productos" | python3 -c "import sys,json; d=json.load(sys.stdin); print([p for p in d if p['descripcion']=='Café molido de especialidad 1kg'][0]['id'])")
UNIDAD_KG=$(curl -s $BASE/unidades | python3 -c "import sys,json; print([u for u in json.load(sys.stdin) if u['unidad']=='KG'][0]['id'])")
curl -s -w "\nHTTP:%{http_code}\n" -X PUT $BASE/productos/$PROD_ID -H "Content-Type: application/json" -d "{\"codigoSat\":\"89231700\",\"descripcion\":\"Café molido de especialidad 1kg\",\"unidadId\":\"$UNIDAD_KG\",\"categoriaId\":\"$CAT\",\"ivaId\":\"$IVA\",\"costo\":\"220.00\",\"margen\":\"50\",\"notas\":\"Actualizado vía prueba API\"}" | python3 -c "import sys; lineas=sys.stdin.read().splitlines(); import json; d=json.loads(lineas[0]); print('subtotal:',d['subtotal'],'margen:',d['margen'],'notas:',d['notas']); print(lineas[-1])"

echo "=== 5. margen=999.99 permitido; 1000 → 400 ==="
UNIDAD_PZA=$(curl -s $BASE/unidades | python3 -c "import sys,json; print([u for u in json.load(sys.stdin) if u['unidad']=='PZA'][0]['id'])")
curl -s -o /dev/null -w "margen 999.99 → HTTP:%{http_code}\n" -X POST $BASE/productos -H "Content-Type: application/json" -d "{\"codigoSat\":\"99999999\",\"descripcion\":\"Producto temporal margen alto\",\"unidadId\":\"$UNIDAD_PZA\",\"categoriaId\":\"$CAT\",\"ivaId\":\"$IVA\",\"costo\":\"10\",\"margen\":\"999.99\"}"
curl -s -o /dev/null -w "margen 1000  → HTTP:%{http_code}\n" -X POST $BASE/productos -H "Content-Type: application/json" -d "{\"codigoSat\":\"99999999\",\"descripcion\":\"Producto temporal margen alto\",\"unidadId\":\"$UNIDAD_PZA\",\"categoriaId\":\"$CAT\",\"ivaId\":\"$IVA\",\"costo\":\"10\",\"margen\":\"1000\"}"

echo "=== 6. acepta \$ y coma decimal: costo '\$1,234.50' → costo 1234.50 ==="
curl -s -X POST $BASE/productos -H "Content-Type: application/json" -d "{\"codigoSat\":\"88888888\",\"descripcion\":\"Producto temporal formato moneda\",\"unidadId\":\"$UNIDAD_PZA\",\"categoriaId\":\"$CAT\",\"ivaId\":\"$IVA\",\"costo\":\"\$1,234.50\",\"margen\":\"10 %\"}" | python3 -c "import sys,json; d=json.load(sys.stdin); print('costo:',d['costo'],'margen:',d['margen'],'subtotal:',d['subtotal'])"

echo "=== 7. DELETE de unidad PZA en uso por productos → 409 (protección P2003) ==="
UNIDAD_PZA_ID=$(curl -s $BASE/unidades | python3 -c "import sys,json; print([u for u in json.load(sys.stdin) if u['unidad']=='PZA'][0]['id'])")
curl -s -w "\nHTTP:%{http_code}\n" -X DELETE $BASE/unidades/$UNIDAD_PZA_ID

echo "=== 8. limpieza: eliminar los 3 productos temporales ==="
for desc in "Producto temporal margen alto" "Producto temporal formato moneda"; do
  PID=$(curl -s "$BASE/productos" | python3 -c "import sys,json; d=json.load(sys.stdin); print([p['id'] for p in d if p['descripcion']=='$desc'][0])")
  curl -s -o /dev/null -w "DELETE $desc → HTTP:%{http_code}\n" -X DELETE $BASE/productos/$PID
done
echo "=== 9. estado final del catálogo ==="
curl -s $BASE/productos | python3 -c "import sys,json; d=json.load(sys.stdin); [print(f\"  {p['descripcion']} | {p['codigoSat']} | {p['unidad']['unidad']} | {p['categoria']['categoria']} | IVA {p['iva']['tasa']}% | costo {p['costo']} | margen {p['margen']}% | subtotal {p['subtotal']}\") for p in d]"
