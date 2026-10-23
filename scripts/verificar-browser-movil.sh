#!/bin/bash
# Verificación E2E móvil (390x844): acceso, menú, usuarios, overflow, logout.
set -u
cd /home/z/my-project
DL=/home/z/my-project/download
CODE() { curl -s -o /dev/null -w "%{http_code}" "$@" --max-time 10; }
if [ "$(CODE http://localhost:3000/)" != "200" ]; then
  setsid nohup bun run dev </dev/null >/tmp/dev-verify6.log 2>&1 &
  for i in $(seq 1 40); do sleep 1; [ "$(CODE http://localhost:3000/)" = "200" ] && break; done
fi
echo "servidor: $(CODE http://localhost:3000/)"
AB="agent-browser"
$AB close >/dev/null 2>&1 || true
$AB set viewport 390 844
$AB open http://localhost:3000
$AB wait --load networkidle --timeout 20000 2>/dev/null || $AB wait 1500
sleep 1.5

echo "=== LOGIN MÓVIL ==="
$AB snapshot -i -c | head -12
$AB screenshot $DL/captura-login-movil.png

echo "=== INICIAR SESIÓN ==="
$AB find label "Usuario" fill "fcorascon"
$AB find label "Contraseña" fill "xmiswebs"
$AB find role button click --name "Iniciar sesión"
sleep 2.5

echo "=== MENÚ MÓVIL (Sheet) ==="
$AB find role button click --name "Abrir menú de navegación"
sleep 1.2
$AB snapshot -i -c | rg "button" | head -14
$AB screenshot $DL/captura-menu-movil-usuarios.png

echo "=== IR A USUARIOS ==="
$AB find role button click --name "Usuarios"
sleep 2
$AB snapshot -c | rg -i "Usuarios|fcorascon|Administrador|Activo" | head -8
$AB screenshot $DL/captura-usuarios-movil.png

echo "=== OVERFLOW HORIZONTAL ==="
$AB eval "JSON.stringify({scrollW:document.documentElement.scrollWidth, clientW:document.documentElement.clientWidth, body:document.body.scrollWidth})"

echo "=== CERRAR SESIÓN DESDE EL MENÚ ==="
$AB find role button click --name "Abrir menú de navegación"
sleep 1
$AB find role button click --name "Cerrar sesión"
sleep 2
$AB snapshot -i -c | rg "Iniciar sesión" | head -2
$AB screenshot $DL/captura-sesion-cerrada-movil.png

echo "=== consola/errores ==="
$AB console | rg -iv "fast refresh|hmr|devtools|download the react" | tail -4
$AB errors | tail -3
$AB close
