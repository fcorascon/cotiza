/**
 * Limpieza post-verificación: elimina la contraseña SMTP temporal
 * usada para probar el envío de correos (queda como no configurada).
 * Uso: bun scripts/limpiar-smtp-prueba.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const borrados = await prisma.envioCorreo.deleteMany({});
  console.log(`Bitácora de envíos de prueba vaciada (${borrados.count} registro(s)).`);

  const actualizado = await prisma.configuracion.update({
    where: { id: "principal" },
    data: { smtpPassword: "" },
    select: { smtpUsuario: true, smtpPassword: true },
  });
  console.log(
    `Contraseña SMTP limpiada (queda vacía). Usuario conservado: ${actualizado.smtpUsuario}`
  );
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
