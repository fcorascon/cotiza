#!/bin/bash
# Verificación E2E escritorio (1440x900) del flujo de acceso + usuarios.
set -u
cd /home/z/my-project
DL=/home/z/my-project/download
CODE() { curl -s -o /dev/null -w "%{http_code}" "$@" --max-time 10; }
J='Content-Type: application/json'
B=/tmp/cj2.txt; rm -f $B

# 1) Servidor vivo
if [ "$(CODE http://localhost:3000/)" != "200" ]; then
  setsid nohup bun run dev </dev/null >/tmp/dev-verify2.log 2>&1 &
  for i in $(seq 1 40); do sleep 1; [ "$(CODE http://localhost:3000/)" = "200" ] && break; done
fi
echo "servidor: $(CODE http://localhost:3000/)"

# 2) Limpieza de la cuenta de prueba olvidada por typo
curl -s -c $B -X POST http://localhost:3000/api/auth/login -H "$J" -d '{"usuario":"fcorascon","password":"xmiswebs"}' -o /dev/null
ID_M=$(curl -s -b $B http://localhost:3000/api/usuarios | python3 -c "import sys,json;us=json.load(sys.stdin);print(next((u['id'] for u in us if u['usuario']=='mayus.probando'),''))")
if [ -n "$ID_M" ]; then
  curl -s -b $B -X DELETE http://localhost:3000/api/usuarios/$ID_M -o /dev/null -w "limpieza mayus.probando: [%{http_code}]\n"
fi
curl -s -b $B -c $B -X POST http://localhost:3000/api/auth/logout -o /dev/null
rm -f $B

AB="agent-browser"
$AB close >/dev/null 2>&1 || true
$AB set viewport 1440 900
$AB open http://localhost:3000
$AB wait --load networkidle --timeout 20000 2>/dev/null || $AB wait 1500
sleep 1

echo "=== PANTALLA LOGIN (escritorio) ==="
$AB snapshot -i -c | head -30
$AB screenshot $DL/captura-login-escritorio.png

echo "=== LOGIN CON CONTRASEÑA INCORRECTA ==="
$AB find label "Usuario" fill "fcorascon"
$AB find label "Contraseña" fill "contrasena-mala"
$AB find role button click --name "Iniciar sesión"
sleep 1.2
$AB snapshot -c | rg -i "incorrectos" | head -2
$AB screenshot $DL/captura-error-login-escritorio.png

echo "=== LOGIN CORRECTO ==="
$AB find label "Contraseña" fill "xmiswebs"
$AB find role button click --name "Iniciar sesión"
sleep 2.5
$AB get url
$AB snapshot -i -c | head -40

echo "=== SECCIÓN USUARIOS ==="
$AB find role button click --name "Usuarios"
sleep 2
$AB snapshot -i -c | head -50
$AB screenshot $DL/captura-usuarios-escritorio.png
