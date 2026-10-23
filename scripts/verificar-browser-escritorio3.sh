#!/bin/bash
# Verificación E2E escritorio parte 3: eliminar usuario + cerrar sesión.
set -u
cd /home/z/my-project
DL=/home/z/my-project/download
CODE() { curl -s -o /dev/null -w "%{http_code}" "$@" --max-time 10; }
if [ "$(CODE http://localhost:3000/)" != "200" ]; then
  setsid nohup bun run dev </dev/null >/tmp/dev-verify5.log 2>&1 &
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

echo "=== ELIMINAR recepcion1 ==="
$AB find role button click --name "Eliminar usuario recepcion1"
sleep 1.2
$AB snapshot -i -c | rg "button" | head -6
$AB find role button click --name "Eliminar" --timeout 5000
sleep 2.5
echo "=== fila tras eliminar (esperado: nada) ==="
$AB snapshot -c | rg -i "recepcion1" | head -3
echo "(vacío = eliminado ✓)"
$AB screenshot $DL/captura-usuario-eliminado-escritorio.png

echo "=== CERRAR SESIÓN ==="
$AB find role button click --name "Cerrar sesión"
sleep 2.5
$AB snapshot -i -c | rg -i "Iniciar sesión|textbox" | head -5
$AB screenshot $DL/captura-sesion-cerrada-escritorio.png

echo "=== actividad en dev.log ==="
tail -n +$LINES_BEFORE /home/z/my-project/dev.log | rg "DELETE /api/usuarios|POST /api/auth" | head -5
echo "=== consola/errores ==="
$AB console | rg -iv "fast refresh|hmr|devtools|download the react" | tail -4
$AB errors | tail -3
$AB close
