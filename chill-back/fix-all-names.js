const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllBadNames() {
  // Actualizar todos los userName que NO sean nombres reales
  const result = await prisma.conversation.updateMany({
    where: {
      OR: [
        { userName: { contains: 'Dna' } },
        { userName: { contains: 'dna' } },
        { userName: 'Horarios' },
        { userName: 'horarios' },
        { userName: 'Hola' },
        { userName: 'hola' },
        { userName: 'Buenas' },
        { userName: 'buenas' },
        { userName: null },
      ],
    },
    data: { userName: 'Anónimo' },
  });

  console.log(`✅ Actualizadas ${result.count} conversaciones a "Anónimo"`);

  const all = await prisma.conversation.findMany({
    select: { id: true, userName: true, sessionId: true },
  });

  console.log('\nConversaciones actuales:');
  all.forEach((c) => {
    console.log(`ID: ${c.id} | UserName: "${c.userName}"`);
  });

  await prisma.$disconnect();
}

fixAllBadNames().catch(console.error);
