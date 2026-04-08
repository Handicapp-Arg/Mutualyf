const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupBadUserNames() {
  // Actualizar conversaciones donde userName es un mensaje común
  const badNames = ['Horarios', 'horarios', 'Hola', 'hola', 'buenas', 'Buenas'];

  for (const badName of badNames) {
    const updated = await prisma.conversation.updateMany({
      where: { userName: badName },
      data: { userName: 'Anónimo' },
    });
    console.log(
      `Actualizadas ${updated.count} conversaciones con userName="${badName}" a "Anónimo"`
    );
  }

  console.log('\n✅ Limpieza completada');
  await prisma.$disconnect();
}

cleanupBadUserNames().catch(console.error);
