#!/bin/bash
# Verificación E2E de la API de usuarios/autenticación (todo en una llamada
# porque el sandbox mata los procesos al terminar cada llamada).
set -u
cd /home/z/my-project

CODE() { curl -s -o /dev/null -w "%{http_code}" "$@" --max-time 10; }

# 1) Arrancar servidor si no está vivo
if [ "$(CODE http://localhost:3000/)" != "200" ]; then
  setsid nohup bun run dev </dev/null >/tmp/dev-verify.log 2>&1 &
  for i in $(seq 1 40); do
    sleep 1
    [ "$(CODE http://localhost:3000/)" = "200" ] && break
  done
fi
echo "servidor: $(CODE http://localhost:3000/)"

J='Content-Type: application/json'
B=/tmp/cj.txt; rm -f $B

p(){ printf '%-42s' "$1"; }

p "login incorrecto (espera 401):"; curl -s -X POST http://localhost:3000/api/auth/login -H "$J" -d '{"usuario":"fcorascon","password":"mala"}' -w " [%{http_code}]" --max-time 15; echo
p "login campo vacío (espera 400):"; curl -s -X POST http://localhost:3000/api/auth/login -H "$J" -d '{"usuario":"","password":""}' -w " [%{http_code}]" --max-time 15; echo
p "login correcto (espera 200):"; curl -s -c $B -X POST http://localhost:3000/api/auth/login -H "$J" -d '{"usuario":"fcorascon","password":"xmiswebs"}' -w " [%{http_code}]" --max-time 15; echo
p "me (espera ADMIN):"; curl -s -b $B http://localhost:3000/api/auth/me -w " [%{http_code}]" --max-time 15; echo
p "usuarios sin sesión (espera 401):"; curl -s http://localhost:3000/api/usuarios -o /dev/null -w "[%{http_code}]" --max-time 15; echo
p "usuarios con sesión (espera 200):"; curl -s -b $B http://localhost:3000/api/usuarios -w " [%{http_code}]" --max-time 15; echo

ID_F=$(curl -s -b $B http://localhost:3000/api/usuarios | python3 -c "import sys,json;us=json.load(sys.stdin);print(next(u['id'] for u in us if u['usuario']=='fcorascon'))")
p "id fcorascon: $ID_F (creación duplicada, espera 409):"; curl -s -b $B -X POST http://localhost:3000/api/usuarios -H "$J" -d '{"usuario":"fcorascon","nombre":"Otro","rol":"USUARIO","activo":true,"password":"1234"}' -w " [%{http_code}]" --max-time 15; echo

p "crear auxiliar (espera 201):"; R=$(curl -s -b $B -X POST http://localhost:3000/api/usuarios -H "$J" -d '{"usuario":"aux.prueba","nombre":"Auxiliar de Prueba","rol":"USUARIO","activo":true,"password":"prueba1234"}' -w "|%{http_code}" --max-time 15); echo "$R"
ID_A=$(echo "$R" | sed 's/|.*//' | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])" 2>/dev/null)

p "usuario en mayúsculas (normaliza, espera 201):"; curl -s -b $B -X POST http://localhost:3000/api/usuarios -H "$J" -d '{"usuario":"  MAYUS.PROBANDO ","nombre":"Mayúsculas","rol":"USUARIO","activo":true,"password":"1234"}' -o /dev/null -w "[%{http_code}]" --max-time 15; echo
ID_M=$(curl -s -b $B http://localhost:3000/api/usuarios | python3 -c "import sys,json;us=json.load(sys.stdin);print(next((u['id'] for u in us if u['usuario']=='mayus.probandol'),''))" 2>/dev/null)
ID_M=$(curl -s -b $B http://localhost:3000/api/usuarios | python3 -c "import sys,json;us=json.load(sys.stdin);print(next((u['id'] for u in us if u['usuario']=='mayus.probandol' or u['usuario']=='mayus.probanding'),''))" 2>/dev/null)

p "actualizar auxiliar (espera 200):"; curl -s -b $B -X PUT http://localhost:3000/api/usuarios/$ID_A -H "$J" -d '{"nombre":"Auxiliar Renombrado"}' -o /dev/null -w "[%{http_code}]" --max-time 15; echo
p "cambiar contraseña auxiliar (espera 200):"; curl -s -b $B -X PUT http://localhost:3000/api/usuarios/$ID_A -H "$J" -d '{"password":"nueva4567"}' -o /dev/null -w "[%{http_code}]" --max-time 15; echo
p "login auxiliar tras cambio (espera 200):"; curl -s -X POST http://localhost:3000/api/auth/login -H "$J" -d '{"usuario":"aux.prueba","password":"nueva4567"}' -o /dev/null -w "[%{http_code}]" --max-time 15; echo
p "desactivar a sí mismo (espera 400):"; curl -s -b $B -X PUT http://localhost:3000/api/usuarios/$ID_F -H "$J" -d '{"activo":false}' -w " [%{http_code}]" --max-time 15; echo
p "eliminarse a sí mismo (espera 400):"; curl -s -b $B -X DELETE http://localhost:3000/api/usuarios/$ID_F -w " [%{http_code}]" --max-time 15; echo
p "eliminar auxiliar (espera 200):"; curl -s -b $B -X DELETE http://localhost:3000/api/usuarios/$ID_A -o /dev/null -w "[%{http_code}]" --max-time 15; echo
[ -n "$ID_M" ] && { p "eliminar mayúsculas (espera 200):"; curl -s -b $B -X DELETE http://localhost:3000/api/usuarios/$ID_M -o /dev/null -w "[%{http_code}]" --max-time 15; echo; }

p "lista final (solo fcorascon):"; curl -s -b $B http://localhost:3000/api/usuarios --max-time 15; echo
p "logout (espera 200):"; curl -s -b $B -c $B -X POST http://localhost:3000/api/auth/logout -o /dev/null -w "[%{http_code}]" --max-time 15; echo
p "me tras logout (espera 401):"; curl -s -b $B http://localhost:3000/api/auth/me -o /dev/null -w "[%{http_code}]" --max-time 15; echo
