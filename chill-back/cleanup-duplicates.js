const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupDuplicates() {
  console.log('🧹 Limpiando conversaciones duplicadas...\n');

  // Obtener todas las conversaciones agrupadas por sessionId
  const allConversations = await prisma.conversation.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // Agrupar por sessionId
  const grouped = {};
  allConversations.forEach((conv) => {
    if (!grouped[conv.sessionId]) {
      grouped[conv.sessionId] = [];
    }
    grouped[conv.sessionId].push(conv);
  });

  let totalDeleted = 0;

  // Para cada sessionId, mantener solo la más reciente
  for (const [sessionId, conversations] of Object.entries(grouped)) {
    if (conversations.length > 1) {
      // Ordenar por fecha (más reciente primero)
      conversations.sort((a, b) => b.createdAt - a.createdAt);

      // Mantener la primera (más reciente), borrar el resto
      const toKeep = conversations[0];
      const toDelete = conversations.slice(1).map((c) => c.id);

      if (toDelete.length > 0) {
        const deleted = await prisma.conversation.deleteMany({
          where: { id: { in: toDelete } },
        });
        totalDeleted += deleted.count;
        console.log(
          `SessionId: ${sessionId} - Mantenida: ${toKeep.id}, Eliminadas: ${deleted.count}`
        );
      }
    }
  }

  console.log(`\n✅ Total eliminadas: ${totalDeleted}`);
  console.log(`✅ Total restantes: ${allConversations.length - totalDeleted}`);

  await prisma.$disconnect();
}

cleanupDuplicates().catch(console.error);
