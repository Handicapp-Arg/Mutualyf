const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConversations() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log('Últimas 10 conversaciones:\n');
  conversations.forEach((conv, i) => {
    console.log(`${i + 1}. ID: ${conv.id}`);
    console.log(`   UserName: "${conv.userName}"`);
    console.log(`   SessionId: ${conv.sessionId}`);
    console.log(`   Fecha: ${conv.createdAt}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkConversations().catch(console.error);
