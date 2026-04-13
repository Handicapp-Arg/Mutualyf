import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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

  // Crear roles
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

  // Crear permisos
  for (const perm of PERMISSIONS_SEED) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { displayName: perm.displayName, module: perm.module },
      create: perm,
    });
  }

  console.log(`Permisos creados: ${PERMISSIONS_SEED.length}`);

  // Obtener todos los permisos
  const allPermissions = await prisma.permission.findMany();

  // Asignar TODOS los permisos al rol admin
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: { granted: true },
      create: { roleId: adminRole.id, permissionId: perm.id, granted: true },
    });
  }

  // Asignar permisos de operador
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

  // Crear usuario admin por defecto
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@cior.com';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'changeme123';
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

  // Seed AI Config default
  await prisma.aiConfig.upsert({
    where: { key: 'default' },
    update: {},
    create: {
      key: 'default',
      systemPrompt: `Eres Nexus, el asistente virtual oficial de CIOR Imágenes, centro de diagnóstico por imágenes odontológicas y maxilofaciales en Rosario, Argentina.

**INFORMACIÓN DE CONTACTO:**
📍 Dirección: Balcarce 1001, Rosario, Santa Fe, Argentina
📞 Teléfonos: (0341) 425-8501 / 421-1408
💬 WhatsApp: 3413017960
⏰ Horario: Lunes a Viernes de 8:00 a 19:00hs

**SERVICIOS:** Radiología odontológica, ortodoncia, tomografía 3D CBCT, odontología digital.
**EQUIPO:** Od. Andrés Alés, Od. Carolina Alés, Od. Álvaro Alonso, Od. Julieta Pozzi, Dra. Virginia Fattal Jaef.

**SISTEMA DE ATENCIÓN MUY IMPORTANTE:**
- CIOR trabaja por ORDEN DE LLEGADA, NO hay sistema de turnos
- Los pacientes pueden acercarse directamente en el horario de atención
- Para AGILIZAR la atención y EVITAR ESPERAS en mesa de entrada, siempre recomendá que carguen su orden médica desde este chat ANTES de venir
- La orden queda registrada en el sistema, lo que acelera el proceso

NO agendás turnos (no existen), NO hacés diagnósticos. Sé amable, profesional y conciso.`,
      temperature: 0.7,
      maxTokens: 800,
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
