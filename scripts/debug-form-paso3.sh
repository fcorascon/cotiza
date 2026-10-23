#!/bin/bash
# Depuración paso 3: todo en una sesión con refs frescos.
set -u
cd /home/z/my-project
CODE() { curl -s -o /dev/null -w "%{http_code}" "$@" --max-time 10; }
if [ "$(CODE http://localhost:3000/)" != "200" ]; then
  setsid nohup bun run dev </dev/null >/tmp/dev-debug3.log 2>&1 &
  for i in $(seq 1 40); do sleep 1; [ "$(CODE http://localhost:3000/)" = "200" ] && break; done
fi
LINES_BEFORE=$(wc -l < /home/z/my-project/dev.log)
AB="agent-browser"
$AB close >/dev/null 2>&1 || true
$AB set viewport 1440 900
$AB open http://localhost:3000
$AB wait --load networkidle --timeout 20000 2>/dev/null || $AB wait 1500
sleep 1
$AB find label "Usuario" fill "fcorascon"
$AB find label "Contraseña" fill "xmiswebs"
$AB find role button click --name "Iniciar sesión"
sleep 2.5
$AB find role button click --name "Usuarios"
sleep 1.5
$AB find role button click --name "Nuevo usuario"
sleep 1

echo "=== snapshot i (refs frescos) ==="
$AB snapshot -i -c | rg "textbox|button \"Guardar|switch" | head -8

echo "=== llenar y guardar (usando find semantic con nombres exactos) ==="
$AB find label "Usuario" fill "recepcion1"
$AB find label "Nombre" fill "Recepción Sucursal"
$AB find label "Contraseña" fill "recepcion2026"

echo "=== valores reales de los campos (eval) ==="
$AB eval "JSON.stringify(Array.from(document.querySelectorAll('form input')).map(i=>({id:i.id,type:i.type,v:i.value})))"

echo "=== clic Guardar usuario ==="
$AB find role button click --name "Guardar usuario"
sleep 2.5

echo "=== estado del form tras clic (errores de campo) ==="
$AB eval "JSON.stringify(Array.from(document.querySelectorAll('form [role=alert], form .text-destructive')).map(e=>e.textContent))"

echo "=== consola ==="
$AB console | tail -6
echo "=== POST en dev.log ==="
tail -n +$LINES_BEFORE /home/z/my-project/dev.log | rg "POST /api/usuarios" || echo "(sin POST)"
$AB close
