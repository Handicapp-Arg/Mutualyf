export enum PermissionCode {
  // Conversations
  CONVERSATIONS_READ = 'conversations:read',
  CONVERSATIONS_DELETE = 'conversations:delete',
  CONVERSATIONS_TAKEOVER = 'conversations:takeover',

  // Sessions
  SESSIONS_READ = 'sessions:read',
  SESSIONS_LIVE = 'sessions:live',

  // Uploads
  UPLOADS_READ = 'uploads:read',
  UPLOADS_VALIDATE = 'uploads:validate',

  // Users
  USERS_READ = 'users:read',
  USERS_MANAGE = 'users:manage',

  // Roles
  ROLES_READ = 'roles:read',
  ROLES_MANAGE = 'roles:manage',
}

export const PERMISSIONS_SEED = [
  { code: PermissionCode.CONVERSATIONS_READ, displayName: 'Ver conversaciones', module: 'conversations' },
  { code: PermissionCode.CONVERSATIONS_DELETE, displayName: 'Eliminar conversaciones', module: 'conversations' },
  { code: PermissionCode.CONVERSATIONS_TAKEOVER, displayName: 'Intervenir en chats', module: 'conversations' },
  { code: PermissionCode.SESSIONS_READ, displayName: 'Ver sesiones', module: 'sessions' },
  { code: PermissionCode.SESSIONS_LIVE, displayName: 'Ver sesiones en vivo', module: 'sessions' },
  { code: PermissionCode.UPLOADS_READ, displayName: 'Ver órdenes médicas', module: 'uploads' },
  { code: PermissionCode.UPLOADS_VALIDATE, displayName: 'Validar órdenes médicas', module: 'uploads' },
  { code: PermissionCode.USERS_READ, displayName: 'Ver usuarios', module: 'users' },
  { code: PermissionCode.USERS_MANAGE, displayName: 'Gestionar usuarios', module: 'users' },
  { code: PermissionCode.ROLES_READ, displayName: 'Ver roles', module: 'roles' },
  { code: PermissionCode.ROLES_MANAGE, displayName: 'Gestionar roles y permisos', module: 'roles' },
];

export const OPERATOR_PERMISSIONS = [
  PermissionCode.CONVERSATIONS_READ,
  PermissionCode.CONVERSATIONS_TAKEOVER,
  PermissionCode.SESSIONS_READ,
  PermissionCode.SESSIONS_LIVE,
];
