# CIOR - Centro de Imágenes y Odontología Radiológica

<div align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/Vite-5.1-646CFF?style=for-the-badge&logo=vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css" />
</div>

## 🚀 Stack Tecnológico 2026

### Core
- **React 18.3** - Librería UI con Concurrent Features
- **TypeScript 5.3** - Tipado estático y seguridad de código
- **Vite 5.1** - Build tool ultrarrápido con HMR
- **React Router DOM 6** - Routing moderno

### Styling
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **PostCSS** - Transformaciones CSS
- **Autoprefixer** - Compatibilidad cross-browser

### Estado y Formularios
- **Zustand 4.5** - State management minimalista
- **React Hook Form 7.50** - Gestión de formularios performante
- **Zod 3.22** - Validación de schemas TypeScript-first

### Desarrollo
- **ESLint 8** - Linting con reglas TypeScript
- **Prettier 3.2** - Formateo de código consistente
- **Husky 9** - Git hooks para calidad
- **Lint-staged 15** - Pre-commit linting

### Testing
- **Vitest 1.2** - Unit testing ultrarrápido
- **Testing Library** - Testing centrado en usuario

## 📁 Arquitectura del Proyecto

```
CIOR/
├── public/                      # Assets estáticos
├── src/
│   ├── app.tsx                  # Componente raíz
│   ├── main.tsx                 # Entry point
│   │
│   ├── components/              # Componentes reutilizables
│   │   ├── ui/                  # Sistema de diseño base
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── badge.tsx
│   │   └── layout/              # Componentes de layout
│   │       ├── header.tsx
│   │       ├── footer.tsx
│   │       ├── nav-dropdown.tsx
│   │       └── mobile-menu.tsx
│   │
│   ├── features/                # Features por dominio
│   │   ├── nexus-bot/           # Bot asistente virtual
│   │   │   ├── nexus-bot.tsx
│   │   │   ├── bot-face.tsx
│   │   │   ├── bot-greeting.tsx
│   │   │   └── bot-hub.tsx
│   │   └── home/                # Secciones home
│   │       ├── hero-section.tsx
│   │       └── info-section.tsx
│   │
│   ├── pages/                   # Páginas de la app
│   │   └── home.tsx
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── use-scrolled.ts
│   │   └── use-media-query.ts
│   │
│   ├── lib/                     # Utilities y helpers
│   │   └── utils.ts
│   │
│   ├── config/                  # Configuración
│   │   ├── site.ts              # Config del sitio
│   │   └── design-tokens.ts     # Tokens de diseño
│   │
│   ├── types/                   # TypeScript types
│   │   └── index.ts
│   │
│   └── styles/                  # Estilos globales
│       └── globals.css
│
├── .eslintrc.cjs                # Config ESLint
├── .prettierrc                  # Config Prettier
├── tailwind.config.js           # Config Tailwind
├── tsconfig.json                # Config TypeScript
├── vite.config.ts               # Config Vite
└── package.json
```

## 🎨 Principios de Arquitectura

### 1. **Separación por Features**
Cada feature es un módulo independiente con su propia lógica, componentes y estado.

### 2. **Componentes Reutilizables**
Sistema de diseño en `components/ui/` que provee componentes base consistentes.

### 3. **Type Safety First**
TypeScript estricto en toda la aplicación con tipos centralizados.

### 4. **Barrel Exports**
Cada carpeta tiene su `index.ts` para exports limpios.

### 5. **Path Aliases**
Imports absolutos con `@/` para mejor DX.

## 🛠️ Comandos Disponibles

```bash
# Desarrollo
pnpm dev              # Inicia dev server en localhost:3000

# Build
pnpm build            # Compila para producción
pnpm preview          # Preview del build

# Calidad de Código
pnpm lint             # Ejecuta ESLint
pnpm lint:fix         # Fix automático de ESLint
pnpm format           # Formatea con Prettier
pnpm format:check     # Verifica formateo
pnpm type-check       # Verifica tipos TypeScript

# Testing
pnpm test             # Ejecuta tests
pnpm test:ui          # UI de testing
pnpm test:coverage    # Coverage report
```

## 🚀 Quick Start

### 1. Instalar dependencias
```bash
# Recomendado: pnpm (más rápido)
pnpm install

# Alternativas
npm install
yarn install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env.local
# Editar .env.local con tus valores
```

### 3. Iniciar desarrollo
```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📦 Build para Producción

```bash
# Build optimizado
pnpm build

# El output estará en /dist
# Sirve con cualquier servidor estático
```

## 🎯 Convenciones de Código

### Naming
- **Componentes**: PascalCase (`HeroSection.tsx`)
- **Hooks**: camelCase con prefijo `use` (`useScrolled.ts`)
- **Utils**: camelCase (`formatPhone()`)
- **Types**: PascalCase (`Service`, `Location`)
- **Constantes**: UPPER_SNAKE_CASE o camelCase según contexto

### Imports
```typescript
// 1. React
import { useState } from 'react';

// 2. Librerías externas
import { Activity } from 'lucide-react';

// 3. Internos (ordenados alfabéticamente)
import { Button } from '@/components/ui';
import { siteConfig } from '@/config/site';
import { useScrolled } from '@/hooks';

// 4. Tipos
import type { Service } from '@/types';
```

### Componentes
```typescript
/**
 * Documentación del componente
 */
export function MyComponent({ prop1, prop2 }: MyComponentProps) {
  // Hooks primero
  const [state, setState] = useState();
  
  // Lógica
  const handleClick = () => {};
  
  // Render
  return <div>...</div>;
}
```

## 🎨 Sistema de Diseño

### Colores
```typescript
import { colors } from '@/config/design-tokens';

// Corporate: #365583
colors.corporate.DEFAULT
colors.corporate[500]

// Accent colors
colors.accent.cyan
colors.accent.green
```

### Tipografía
```typescript
import { typography } from '@/config/design-tokens';

// Headings
typography.heading.h1
typography.heading.h2

// Body
typography.body.large
typography.body.base

// Labels
typography.label.large
typography.label.small
```

### Spacing
```typescript
import { spacing } from '@/config/design-tokens';

// Container
spacing.container // max-w-7xl mx-auto

// Section padding
spacing.section.py // py-24 lg:py-32
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test -- --watch

# UI mode
pnpm test:ui

# Coverage
pnpm test:coverage
```

## 🔒 Pre-commit Hooks

Husky ejecuta automáticamente antes de cada commit:
- **ESLint** en archivos staged
- **Prettier** formatea código
- **Type checking** con TypeScript

## 📝 Git Workflow

```bash
# Feature branch
git checkout -b feature/nueva-funcionalidad

# Commits semánticos
git commit -m "feat: agrega nueva funcionalidad"
git commit -m "fix: corrige bug en navegación"
git commit -m "docs: actualiza README"

# Push
git push origin feature/nueva-funcionalidad
```

### Prefijos de Commit
- `feat:` - Nueva funcionalidad
- `fix:` - Bug fix
- `docs:` - Documentación
- `style:` - Formateo, sin cambio de código
- `refactor:` - Refactorización
- `test:` - Agregar tests
- `chore:` - Mantenimiento

## 🚢 Deployment

### Vercel (Recomendado)
```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
vercel
```

### Netlify
```bash
# Build command
pnpm build

# Publish directory
dist
```

### Configuración build
```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

## 📚 Resources

- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Router](https://reactrouter.com)

## 👥 Equipo

**CIOR Imagen Argentina**
- GitHub: [@Ciorimagen-ARG](https://github.com/Ciorimagen-ARG)
- Website: [cior.com.ar](https://cior.com.ar)

## 📄 Licencia

Privado - © 2026 CIOR Imágenes

---

<div align="center">
  <strong>Hecho con ❤️ para CIOR por el equipo de desarrollo</strong>
</div>
