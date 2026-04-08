const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateAllToAnonymous() {
  // Actualizar TODAS las conversaciones que no tengan un nombre con apellido válido
  const all = await prisma.conversation.findMany();

  let updated = 0;
  for (const conv of all) {
    // Si el userName no tiene formato "Nombre Apellido" (dos palabras capitalizadas),
    // o contiene palabras comunes, cambiar a Anónimo
    const name = conv.userName || '';
    const words = name.split(/\s+/).filter((w) => w.length > 0);

    // Palabras que NO son nombres reales
    const commonWords = [
      'horarios',
      'hola',
      'buenas',
      'gracias',
      'dna',
      'dni',
      'turno',
      'consulta',
    ];
    const isCommonWord = commonWords.some((word) => name.toLowerCase().includes(word));

    // Si tiene una sola palabra O es una palabra común, cambiar a Anónimo
    if (words.length < 2 || isCommonWord || name === '' || name === null) {
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { userName: 'Anónimo' },
      });
      console.log(`Actualizada ${conv.id}: "${name}" → "Anónimo"`);
      updated++;
    } else {
      console.log(`Mantenida ${conv.id}: "${name}" (parece nombre real)`);
    }
  }

  console.log(`\n✅ Total actualizadas: ${updated}`);
  await prisma.$disconnect();
}

updateAllToAnonymous().catch(console.error);
