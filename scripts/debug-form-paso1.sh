#!/bin/bash
# Depuración enfocada del guardado del formulario de usuario.
set -u
cd /home/z/my-project
CODE() { curl -s -o /dev/null -w "%{http_code}" "$@" --max-time 10; }
if [ "$(CODE http://localhost:3000/)" != "200" ]; then
  setsid nohup bun run dev </dev/null >/tmp/dev-debug.log 2>&1 &
  for i in $(seq 1 40); do sleep 1; [ "$(CODE http://localhost:3000/)" = "200" ] && break; done
fi
echo "servidor: $(CODE http://localhost:3000/)"
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

echo "=== refs de los campos ==="
$AB snapshot -i -c | head -25

echo "=== llenado por refs ==="
$AB fill @e7 "recepcion1" 2>/dev/null || echo "e7 falló"
$AB get value @e7 2>/dev/null
echo "---"
