/**
 * Crea (o restablece) el usuario administrador principal de la aplicación.
 *
 * Uso:   bun scripts/crear-usuario-admin.ts
 * Re-ejecutable: si el usuario ya existe, actualiza rol/estado/contraseña.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const USUARIO = "fcorascon";
const PASSWORD = "xmiswebs";
const NOMBRE = "Administrador";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const usuario = await prisma.usuario.upsert({
    where: { usuario: USUARIO },
    update: { passwordHash, rol: "ADMIN", activo: true, nombre: NOMBRE },
    create: {
      usuario: USUARIO,
      nombre: NOMBRE,
      passwordHash,
      rol: "ADMIN",
      activo: true,
    },
  });

  console.log(
    `[OK] Usuario administrador listo: ${usuario.usuario} (rol: ${usuario.rol}, activo: ${usuario.activo})`
  );
}

main()
  .catch((error) => {
    console.error("[ERROR] No se pudo crear el usuario administrador:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
