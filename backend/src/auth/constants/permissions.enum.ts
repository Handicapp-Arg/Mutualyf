export enum PermissionCode {
  // Conversations
  CONVERSATIONS_READ = 'conversations:read',
  CONVERSATIONS_DELETE = 'conversations:delete',
  CONVERSATIONS_TAKEOVER = 'conversations:takeover',

  // Sessions
  SESSIONS_READ = 'sessions:read',
  SESSIONS_LIVE = 'sessions:live',

  // Users
  USERS_READ = 'users:read',
  USERS_MANAGE = 'users:manage',

  // Roles
  ROLES_READ = 'roles:read',
  ROLES_MANAGE = 'roles:manage',

  // AI Config
  AI_CONFIG_MANAGE = 'ai_config:manage',
}

export const PERMISSIONS_SEED = [
  { code: PermissionCode.CONVERSATIONS_READ, displayName: 'Ver conversaciones', module: 'conversations' },
  { code: PermissionCode.CONVERSATIONS_DELETE, displayName: 'Eliminar conversaciones', module: 'conversations' },
  { code: PermissionCode.CONVERSATIONS_TAKEOVER, displayName: 'Intervenir en chats', module: 'conversations' },
  { code: PermissionCode.SESSIONS_READ, displayName: 'Ver sesiones', module: 'sessions' },
  { code: PermissionCode.SESSIONS_LIVE, displayName: 'Ver sesiones en vivo', module: 'sessions' },
  { code: PermissionCode.USERS_READ, displayName: 'Ver usuarios', module: 'users' },
  { code: PermissionCode.USERS_MANAGE, displayName: 'Gestionar usuarios', module: 'users' },
  { code: PermissionCode.ROLES_READ, displayName: 'Ver roles', module: 'roles' },
  { code: PermissionCode.ROLES_MANAGE, displayName: 'Gestionar roles y permisos', module: 'roles' },
  { code: PermissionCode.AI_CONFIG_MANAGE, displayName: 'Configurar IA', module: 'ai' },
];

export const OPERATOR_PERMISSIONS = [
  PermissionCode.CONVERSATIONS_READ,
  PermissionCode.CONVERSATIONS_TAKEOVER,
  PermissionCode.SESSIONS_READ,
  PermissionCode.SESSIONS_LIVE,
];
