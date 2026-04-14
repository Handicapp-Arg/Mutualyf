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

  // Seed AI Config default
  await prisma.aiConfig.upsert({
    where: { key: 'default' },
    update: {
      quickButtons: JSON.stringify(DEFAULT_QUICK_BUTTONS),
    },
    create: {
      key: 'default',
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 800,
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
