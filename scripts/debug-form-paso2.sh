#!/bin/bash
# Depuración paso 2: llenar por refs, guardar y observar resultado.
set -u
cd /home/z/my-project
CODE() { curl -s -o /dev/null -w "%{http_code}" "$@" --max-time 10; }
if [ "$(CODE http://localhost:3000/)" != "200" ]; then
  setsid nohup bun run dev </dev/null >/tmp/dev-debug2.log 2>&1 &
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

echo "=== llenar por refs (usuario=e17, nombre=e18, pass=e24) ==="
$AB fill @e17 "recepcion1"
$AB fill @e18 "Recepción Sucursal"
$AB fill @e24 "recepcion2026"
echo "=== estado antes de guardar ==="
$AB get value @e17; $AB get value @e18; $AB get value @e24
echo "=== clic Guardar usuario ==="
$AB click @e21
sleep 2.5
echo "=== snapshot tras guardar ==="
$AB snapshot -c | head -45
echo "=== consola ==="
$AB console | tail -8
$AB errors | tail -5
echo "=== peticiones nuevas en dev.log ==="
tail -n +$LINES_BEFORE /home/z/my-project/dev.log | rg "POST /api/usuarios" || echo "(sin POST /api/usuarios)"
$AB screenshot /home/z/my-project/download/debug-guardado.png
$AB close
