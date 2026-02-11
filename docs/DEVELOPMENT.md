# Guía de Desarrollo - CIOR

## 🎯 Overview

Esta guía describe las mejores prácticas y flujos de trabajo para desarrollar en el proyecto CIOR.

## 📋 Requisitos Previos

- **Node.js**: >= 20.0.0
- **pnpm**: >= 8.0.0 (recomendado)
- **Editor**: VSCode (recomendado)

### Extensiones VSCode Recomendadas

Crear archivo `.vscode/extensions.json`:
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

## 🏗️ Estructura de Features

Cada feature sigue esta estructura:

```
features/
└── mi-feature/
    ├── index.ts              # Barrel export
    ├── mi-feature.tsx        # Componente principal
    ├── components/           # Componentes internos
    │   ├── sub-component.tsx
    │   └── index.ts
    ├── hooks/                # Hooks específicos
    │   └── use-mi-hook.ts
    └── types.ts              # Tipos locales
```

### Ejemplo: Creando una nueva feature

```typescript
// features/nueva-feature/index.ts
export { NuevaFeature } from './nueva-feature';

// features/nueva-feature/nueva-feature.tsx
import { useState } from 'react';
import { Button } from '@/components/ui';

export function NuevaFeature() {
  const [state, setState] = useState();
  
  return (
    <div>
      <Button>Mi Feature</Button>
    </div>
  );
}
```

## 🎨 Componentes UI

### Crear un nuevo componente UI

```typescript
// components/ui/mi-componente.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface MiComponenteProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary';
  className?: string;
}

export function MiComponente({ 
  children, 
  variant = 'default',
  className 
}: MiComponenteProps) {
  const variants = {
    default: 'bg-white',
    primary: 'bg-corporate text-white',
  };
  
  return (
    <div className={cn(variants[variant], className)}>
      {children}
    </div>
  );
}
```

### Exportar en el barrel

```typescript
// components/ui/index.ts
export { MiComponente } from './mi-componente';
```

## 🪝 Custom Hooks

### Patrón para custom hooks

```typescript
// hooks/use-ejemplo.ts
import { useState, useEffect } from 'react';

export function useEjemplo(param: string) {
  const [data, setData] = useState<string | null>(null);
  
  useEffect(() => {
    // Lógica del hook
    setData(param);
  }, [param]);
  
  return { data };
}
```

### Uso

```typescript
import { useEjemplo } from '@/hooks';

function MiComponente() {
  const { data } = useEjemplo('test');
  return <div>{data}</div>;
}
```

## 🎯 TypeScript

### Definir tipos

```typescript
// types/index.ts
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
}

export type UsuarioFormulario = Omit<Usuario, 'id'>;
```

### Uso de tipos

```typescript
import type { Usuario } from '@/types';

function procesarUsuario(usuario: Usuario) {
  // ...
}
```

## 🎨 Styling con Tailwind

### Uso del helper `cn()`

```typescript
import { cn } from '@/lib/utils';

function MiComponente({ className }: { className?: string }) {
  return (
    <div className={cn(
      'base-classes',
      'hover:shadow-lg',
      className
    )}>
      Contenido
    </div>
  );
}
```

### Tokens de diseño

```typescript
import { colors, typography, spacing } from '@/config/design-tokens';

// En componentes, usa las clases de Tailwind:
<div className="bg-corporate text-white" />

// Los tokens son para referencia y documentación
```

## 🧪 Testing

### Test de componente

```typescript
// __tests__/button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### Test de hook

```typescript
// __tests__/use-scrolled.test.ts
import { renderHook } from '@testing-library/react';
import { useScrolled } from '@/hooks';

describe('useScrolled', () => {
  it('returns false initially', () => {
    const { result } = renderHook(() => useScrolled());
    expect(result.current).toBe(false);
  });
});
```

## 📝 Documentación de Código

### Componentes

```typescript
/**
 * Componente Button reutilizable
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="lg">
 *   Click me
 * </Button>
 * ```
 */
export function Button({ ... }) {
  // ...
}
```

### Funciones

```typescript
/**
 * Formatea un número de teléfono argentino
 * 
 * @param phone - Número sin formato
 * @returns Número formateado
 * 
 * @example
 * formatPhone('+541123456789') // '+54 11 2345-6789'
 */
export function formatPhone(phone: string): string {
  // ...
}
```

## 🔄 Estado Global (Zustand)

### Crear un store

```typescript
// stores/user-store.ts
import { create } from 'zustand';

interface UserState {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
```

### Usar el store

```typescript
import { useUserStore } from '@/stores/user-store';

function Profile() {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  
  return <div>{user?.nombre}</div>;
}
```

## 📋 Formularios con React Hook Form

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  
  const onSubmit = (data: FormData) => {
    console.log(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
      
      <input type="password" {...register('password')} />
      {errors.password && <span>{errors.password.message}</span>}
      
      <button type="submit">Login</button>
    </form>
  );
}
```

## 🚀 Performance

### Lazy Loading de componentes

```typescript
import { lazy, Suspense } from 'react';

const MiFeature = lazy(() => import('@/features/mi-feature'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MiFeature />
    </Suspense>
  );
}
```

### Memoización

```typescript
import { memo, useMemo, useCallback } from 'react';

// Componente memoizado
export const MiComponente = memo(function MiComponente({ data }) {
  return <div>{data}</div>;
});

// Valor memoizado
function Parent() {
  const expensiveValue = useMemo(() => computeExpensive(), []);
  
  // Función memoizada
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);
  
  return <MiComponente data={expensiveValue} onClick={handleClick} />;
}
```

## 🐛 Debugging

### React DevTools

Instalar extensión React DevTools en Chrome/Firefox.

### TypeScript Debugging en VSCode

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

## 📦 Agregar Dependencias

```bash
# Dependencia de producción
pnpm add nombre-paquete

# Dependencia de desarrollo
pnpm add -D nombre-paquete

# Actualizar dependencias
pnpm update

# Revisar paquetes outdated
pnpm outdated
```

## 🔧 Troubleshooting

### Limpiar caché

```bash
# Limpiar node_modules
rm -rf node_modules
pnpm install

# Limpiar build
rm -rf dist

# Limpiar caché de Vite
rm -rf node_modules/.vite
```

### Problemas de tipos

```bash
# Verificar tipos
pnpm type-check

# Reinstalar tipos
pnpm add -D @types/node @types/react @types/react-dom
```

## 📚 Recursos Adicionales

- [React Best Practices](https://react.dev/learn)
- [TypeScript Cheat Sheet](https://www.typescriptlang.org/cheatsheets)
- [Tailwind Play](https://play.tailwindcss.com/)
- [Vite Plugins](https://vitejs.dev/plugins/)

---

**¿Preguntas?** Consulta con el equipo o abre un issue en GitHub.
