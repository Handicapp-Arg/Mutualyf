import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_QUICK_BUTTONS } from '../src/ai/ai.constants';

const prisma = new PrismaClient();

const PERMISSIONS_SEED = [
  { code: 'conversations:read', displayName: 'Ver conversaciones', module: 'conversations' },
  { code: 'conversations:delete', displayName: 'Eliminar conversaciones', module: 'conversations' },
  { code: 'conversations:takeover', displayName: 'Intervenir en chats', module: 'conversations' },
  { code: 'sessions:read', displayName: 'Ver sesiones', module: 'sessions' },
  { code: 'sessions:live', displayName: 'Ver sesiones en vivo', module: 'sessions' },
  { code: 'uploads:read', displayName: 'Ver órdenes médicas', module: 'uploads' },
  { code: 'uploads:validate', displayName: 'Validar órdenes médicas', module: 'uploads' },
  { code: 'users:read', displayName: 'Ver usuarios', module: 'users' },
  { code: 'users:manage', displayName: 'Gestionar usuarios', module: 'users' },
  { code: 'roles:read', displayName: 'Ver roles', module: 'roles' },
  { code: 'roles:manage', displayName: 'Gestionar roles y permisos', module: 'roles' },
  { code: 'ai_config:manage', displayName: 'Configurar IA', module: 'ai' },
];

const OPERATOR_PERMISSIONS = [
  'conversations:read',
  'conversations:takeover',
  'sessions:read',
  'sessions:live',
];

async function main() {
  console.log('Seeding database...');

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      displayName: 'Administrador',
      description: 'Acceso completo al sistema',
      isSystem: true,
    },
  });

  const operatorRole = await prisma.role.upsert({
    where: { name: 'operator' },
    update: {},
    create: {
      name: 'operator',
      displayName: 'Operador',
      description: 'Gestión de chats en vivo e intervención',
      isSystem: true,
    },
  });

  console.log(`Roles creados: ${adminRole.name}, ${operatorRole.name}`);

  for (const perm of PERMISSIONS_SEED) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { displayName: perm.displayName, module: perm.module },
      create: perm,
    });
  }

  console.log(`Permisos creados: ${PERMISSIONS_SEED.length}`);

  const allPermissions = await prisma.permission.findMany();

  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: { granted: true },
      create: { roleId: adminRole.id, permissionId: perm.id, granted: true },
    });
  }

  const operatorPerms = allPermissions.filter((p) =>
    OPERATOR_PERMISSIONS.includes(p.code),
  );
  for (const perm of operatorPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: operatorRole.id, permissionId: perm.id } },
      update: { granted: true },
      create: { roleId: operatorRole.id, permissionId: perm.id, granted: true },
    });
  }

  console.log('Permisos asignados a roles');

  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@mutualyf.com';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || '123456';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      fullName: 'Administrador',
      roleId: adminRole.id,
      isActive: true,
    },
  });

  console.log(`Usuario admin creado: ${adminEmail}`);

  // ==========================================
  // Quick Replies — respuestas instantáneas por keywords (0ms, sin IA)
  // Word-boundary matching: "hora" no matchea "ahora"
  // ==========================================
  const quickReplies = [
    {
      keywords: JSON.stringify(['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'buen dia']),
      response: '¡Hola! Soy el asistente virtual de MutuaLyF. Estoy acá para ayudarte con información sobre servicios de salud, horarios, trámites, autorizaciones y la plataforma MiMutuaLyF. ¿En qué te puedo asistir?',
      priority: 20,
    },
    {
      keywords: JSON.stringify(['horario', 'abierto', 'abren', 'cierran', 'atienden', 'que hora']),
      response: '**Horarios de atención de MutuaLyF:**\n\n📞 Teléfono: Lunes a viernes de 07:30 a 19:30 hs\n💻 Online: Plataforma MiMutuaLyF disponible las 24 horas\n🏢 Presencial: En sedes administrativas, en horario laboral\n\n📞 0800 777 4413',
      priority: 15,
    },
    {
      keywords: JSON.stringify(['telefono', 'whatsapp', 'llamar', 'contacto', 'numero', 'comunicarme', '0800']),
      response: '**Canales de contacto de MutuaLyF:**\n\n📞 Teléfono: 0800 777 4413 (Lun-Vie 07:30 a 19:30 hs)\n💬 WhatsApp: Canal habilitado para mensajería\n💻 Plataforma MiMutuaLyF: disponible 24hs\n🏢 Atención presencial en sedes administrativas',
      priority: 14,
    },
    {
      keywords: JSON.stringify(['turno', 'sacar turno', 'cita', 'agendar', 'reservar']),
      response: 'En MutuaLyF no agendamos turnos directamente. Podés elegir profesional dentro del padrón de prestadores y coordinar tu consulta con ellos.\n\nLas órdenes y recetas son exclusivamente digitales y se gestionan desde **MiMutuaLyF** o llamando al 0800 777 4413.',
      priority: 13,
    },
    {
      keywords: JSON.stringify(['mimutualyf', 'plataforma', 'autogestion', 'app', 'aplicacion', 'portal web']),
      response: '**Plataforma MiMutuaLyF — autogestión 24hs:**\n\nDesde la web podés:\n• Solicitar órdenes médicas\n• Gestionar autorizaciones\n• Hacer seguimiento de trámites\n• Consultar estado de solicitudes\n• Pagar coseguros\n• Acceder a tu información personal\n\nDisponible 24hs, todos los días.',
      priority: 13,
    },
    {
      keywords: JSON.stringify(['servicios', 'servicio', 'especialidad', 'especialidades', 'que ofrecen', 'cobertura medica']),
      response: '**Servicios de salud MutuaLyF:**\n\n🏥 Consultas médicas generales y especialidades\n• Clínica médica, Pediatría, Ginecología\n• Cardiología, Salud mental, Nutrición\n• Odontología, Oftalmología\n\n🏨 Internaciones médicas y quirúrgicas\n💊 Cobertura de medicamentos\n🔬 Prácticas y estudios\n\nLibre elección dentro del padrón de prestadores. Gestión completa desde MiMutuaLyF.',
      priority: 12,
    },
    {
      keywords: JSON.stringify(['medicamento', 'medicamentos', 'remedio', 'remedios', 'farmacia', 'vademecum']),
      response: '**Cobertura de medicamentos:**\n\n• Cobertura según el plan del afiliado, basada en vademécum\n• Medicación general, crónicos y alto costo\n• **Receta digital obligatoria** (no se utiliza papel)\n• En algunos casos se requiere autorización previa\n• Tratamientos prolongados requieren seguimiento médico\n\nConsultá la cobertura específica en MiMutuaLyF o al 0800 777 4413.',
      priority: 11,
    },
    {
      keywords: JSON.stringify(['receta', 'recetas', 'receta digital', 'prescripcion']),
      response: '**Recetas en MutuaLyF:**\n\n• Formato **exclusivamente digital** (no se usan en papel)\n• Emitidas por profesionales habilitados\n• Hasta 3 recetas por consulta en tratamientos crónicos\n\nLas recetas se gestionan desde MiMutuaLyF o a través de los canales oficiales.',
      priority: 11,
    },
    {
      keywords: JSON.stringify(['orden medica', 'orden', 'ordenes', 'subir orden', 'cargar orden']),
      response: '**Órdenes médicas MutuaLyF:**\n\n• Son **exclusivamente digitales**\n• Requeridas para prácticas y estudios\n• Se gestionan desde MiMutuaLyF o canales oficiales\n\nPodés subir tu orden médica directamente desde este chat usando el botón de adjuntar archivo (PDF, JPG o PNG, hasta 5MB).',
      priority: 11,
    },
    {
      keywords: JSON.stringify(['autorizacion', 'autorizaciones', 'autorizar', 'tramite', 'tramites']),
      response: '**Trámites y autorizaciones:**\n\nPodés gestionar:\n• Autorizaciones de prácticas y estudios\n• Reintegros\n• Solicitudes de cobertura\n• Presentación de documentación\n\n**Modalidades:**\n💻 Online: plataforma MiMutuaLyF (24hs)\n📞 Telefónica: 0800 777 4413\n🏢 Presencial: en sedes administrativas',
      priority: 10,
    },
    {
      keywords: JSON.stringify(['pago', 'pagos', 'coseguro', 'coseguros', 'medios de pago', 'como pagar', 'abonar']),
      response: '**Medios de pago y coseguros:**\n\n💳 Tarjeta de crédito/débito\n💙 Mercado Pago\n🏦 Santa Fe Servicios\n🎫 Bono Link\n🏢 Pago presencial\n\nEl coseguro depende del tipo de prestación. Algunos servicios requieren pago previo.',
      priority: 10,
    },
    {
      keywords: JSON.stringify(['reintegro', 'reintegros', 'devolucion']),
      response: '**Reintegros MutuaLyF:**\n\nLos reintegros se gestionan a través de:\n💻 Plataforma MiMutuaLyF (recomendado)\n📞 Teléfono: 0800 777 4413\n🏢 Presencial en sedes administrativas\n\nSe requiere presentar la documentación correspondiente.',
      priority: 9,
    },
    {
      keywords: JSON.stringify(['internacion', 'internaciones', 'cirugia', 'operar', 'operacion', 'quirurgica']),
      response: '**Internaciones MutuaLyF:**\n\nCobertura de internaciones médicas y quirúrgicas, con coordinación directa con sanatorios y clínicas.\n\nPara gestionar una internación programada, comunicate con MutuaLyF al 0800 777 4413 o desde MiMutuaLyF.',
      priority: 8,
    },
    {
      keywords: JSON.stringify(['prestador', 'prestadores', 'padron', 'red de prestadores', 'cartilla']),
      response: '**Red de prestadores MutuaLyF:**\n\nTenés libre elección dentro del padrón. La red incluye:\n• Centro médico propio\n• Profesionales externos en toda la provincia de Santa Fe\n• Derivaciones a prestadores de todo el país cuando corresponde\n\nConsultá el padrón completo desde MiMutuaLyF.',
      priority: 8,
    },
    {
      keywords: JSON.stringify(['afiliado', 'afiliada', 'afiliarme', 'afiliacion', 'quien puede']),
      response: '**Afiliación a MutuaLyF:**\n\nMutuaLyF está destinada a afiliados del sindicato Luz y Fuerza y su grupo familiar.\n\nPara consultas sobre afiliación comunicate al **0800 777 4413** o acercate a las sedes administrativas.',
      priority: 7,
    },
    {
      keywords: JSON.stringify(['sobre mutualyf', 'que es mutualyf', 'informacion', 'historia', 'creacion']),
      response: '**Sobre MutuaLyF:**\n\n🏥 **Mutual Provincial de Luz y Fuerza de Santa Fe**\n📅 Fundada en 1999\n🤝 Entidad solidaria de salud sin fines de lucro\n👥 Destinada a afiliados al sindicato Luz y Fuerza y su grupo familiar\n🌎 Cobertura: provincia de Santa Fe, con red nacional por derivaciones\n\n📞 0800 777 4413',
      priority: 5,
    },
    {
      keywords: JSON.stringify(['emergencia', 'urgencia', 'urgente', 'guardia']),
      response: '**Emergencias:**\n\nPara emergencias médicas acudí directamente al hospital o clínica más cercana. MutuaLyF cubre internaciones de urgencia.\n\nPara coordinación posterior: 📞 0800 777 4413',
      priority: 4,
    },
    {
      keywords: JSON.stringify(['gracias', 'muchas gracias', 'genial', 'perfecto', 'excelente', 'chau', 'adios']),
      response: '¡De nada! Si necesitás algo más no dudes en escribirme.\n\nRecordá que podés contactarnos por:\n📞 0800 777 4413\n💻 Plataforma MiMutuaLyF (24hs)',
      priority: 2,
    },
  ];

  await prisma.quickReply.deleteMany();
  for (const qr of quickReplies) {
    await prisma.quickReply.create({ data: qr });
  }

  console.log(`Quick replies creadas: ${quickReplies.length}`);

  // Seed AI Config default — always update prompt + buttons to latest version
  await prisma.aiConfig.upsert({
    where: { key: 'default' },
    update: {
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      quickButtons: JSON.stringify(DEFAULT_QUICK_BUTTONS),
    },
    create: {
      key: 'default',
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 400,
      quickButtons: JSON.stringify(DEFAULT_QUICK_BUTTONS),
    },
  });

  console.log('AI Config default creada');
  console.log('Seed completado exitosamente');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
