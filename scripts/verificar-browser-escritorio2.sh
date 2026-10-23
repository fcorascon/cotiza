#!/bin/bash
# Verificación E2E escritorio parte 2 (v2): CRUD usuarios + cerrar sesión.
set -u
cd /home/z/my-project
DL=/home/z/my-project/download
CODE() { curl -s -o /dev/null -w "%{http_code}" "$@" --max-time 10; }
if [ "$(CODE http://localhost:3000/)" != "200" ]; then
  setsid nohup bun run dev </dev/null >/tmp/dev-verify4.log 2>&1 &
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

echo "=== LOGIN ==="
$AB find label "Usuario" fill "fcorascon"
$AB find label "Contraseña" fill "xmiswebs"
$AB find role button click --name "Iniciar sesión"
sleep 2.5

echo "=== USUARIOS > NUEVO ==="
$AB find role button click --name "Usuarios"
sleep 1.5
$AB find role button click --name "Nuevo usuario"
sleep 1
$AB find label "Usuario" fill "recepcion1"
$AB find label "Nombre" fill "Recepción Sucursal"
$AB find label "Contraseña" fill "recepcion2026"
echo "=== verificar asociación de la contraseña ==="
$AB eval "JSON.stringify(Array.from(document.querySelectorAll('form input[type=password]')).map(i=>({id:i.id,v:i.value})))"
$AB find role button click --name "Guardar usuario"
sleep 2.5
echo "=== fila creada ==="
$AB snapshot -c | rg -i "recepcion1" | head -4
$AB screenshot $DL/captura-usuario-creado-escritorio.png

echo "=== EDITAR: DESACTIVAR recepcion1 ==="
$AB find role button click --name "Editar usuario recepcion1"
sleep 1.2
$AB eval "document.querySelector('button[role=switch]').click()"
sleep 0.5
$AB find role button click --name "Guardar cambios"
sleep 2
echo "=== estado tras editar ==="
$AB snapshot -c | rg -i "Inactivo|recepcion1" | head -4
$AB screenshot $DL/captura-usuario-inactivo-escritorio.png

echo "=== ELIMINAR recepcion1 ==="
$AB find role button click --name "Eliminar usuario recepcion1"
sleep 1.2
$AB eval "const d=document.querySelector('[role=alertdialog]'); JSON.stringify({botones:Array.from(d.querySelectorAll('button')).map(b=>b.textContent)})" 2>/dev/null || echo "sin dialogo"
$AB eval "const d=document.querySelector('[role=alertdialog]'); const b=Array.from(d.querySelectorAll('button')).find(x=>x.textContent.trim()==='Eliminar'); b.click()"
sleep 2
echo "=== fila tras eliminar (esperado: nada) ==="
$AB snapshot -c | rg -i "recepcion1" | head -3
echo "(vacío = eliminado)"
$AB screenshot $DL/captura-usuario-eliminado-escritorio.png

echo "=== CERRAR SESIÓN ==="
$AB find role button click --name "Cerrar sesión"
sleep 2
$AB snapshot -i -c | rg -i "Iniciar sesión|Usuario" | head -4
$AB screenshot $DL/captura-sesion-cerrada-escritorio.png

echo "=== POST /api/usuarios en dev.log ==="
tail -n +$LINES_BEFORE /home/z/my-project/dev.log | rg "POST|PUT|DELETE" | rg "usuarios" | head -6
echo "=== consola/errores ==="
$AB console | rg -iv "fast refresh|hmr|devtools" | tail -4
$AB errors | tail -3
$AB close
