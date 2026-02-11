# 🚀 Guía de Inicio Rápido - CIOR

## ⚡ Instalación Express (5 minutos)

### Opción 1: pnpm (Recomendado - Más Rápido)

```bash
# 1. Instalar pnpm si no lo tienes
npm install -g pnpm

# 2. Instalar dependencias
cd CIOR
pnpm install

# 3. Copiar variables de entorno
cp .env.example .env.local

# 4. Iniciar desarrollo
pnpm dev
```

### Opción 2: npm

```bash
cd CIOR
npm install
cp .env.example .env.local
npm run dev
```

### Opción 3: yarn

```bash
cd CIOR
yarn install
cp .env.example .env.local
yarn dev
```

## ✅ Verificación Post-Instalación

Ejecuta estos comandos para verificar que todo funciona:

```bash
# Type checking
pnpm type-check
# ✅ Debería pasar sin errores

# Linting
pnpm lint
# ✅ Debería pasar sin errores

# Build de prueba
pnpm build
# ✅ Debería generar carpeta dist/

# Tests
pnpm test
# ✅ Debería pasar todos los tests
```

## 🎯 Comandos Esenciales

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Inicia servidor de desarrollo en localhost:3000 |
| `pnpm build` | Compila para producción |
| `pnpm preview` | Preview del build de producción |
| `pnpm lint` | Verifica código con ESLint |
| `pnpm lint:fix` | Corrige errores de linting automáticamente |
| `pnpm format` | Formatea código con Prettier |
| `pnpm test` | Ejecuta tests |

## 📝 Primer Commit

```bash
# Inicializar git (si no está inicializado)
git init

# Agregar archivos
git add .

# Primer commit
git commit -m "feat: initial project setup with enterprise architecture"

# Conectar con GitHub
git remote add origin https://github.com/Ciorimagen-ARG/app.git

# Push
git branch -M main
git push -u origin main
```

## 🔧 Configuración VSCode

1. **Instala extensiones recomendadas**
   - VSCode te pedirá instalarlas automáticamente
   - O ejecuta: `code --install-extension dbaeumer.vscode-eslint`

2. **Habilita formateo automático**
   - Ya está configurado en `.vscode/settings.json`
   - Se formateará al guardar

## 🎨 Empezar a Desarrollar

### Crear un nuevo componente

```bash
# Crear archivo
src/components/ui/mi-componente.tsx
```

```typescript
import { cn } from '@/lib/utils';

interface MiComponenteProps {
  className?: string;
}

export function MiComponente({ className }: MiComponenteProps) {
  return (
    <div className={cn('p-4', className)}>
      Mi Componente
    </div>
  );
}
```

```typescript
// Exportar en index.ts
export { MiComponente } from './mi-componente';
```

### Crear una nueva feature

```bash
mkdir -p src/features/mi-feature
```

```typescript
// src/features/mi-feature/index.ts
export { MiFeature } from './mi-feature';

// src/features/mi-feature/mi-feature.tsx
export function MiFeature() {
  return <div>Mi Feature</div>;
}
```

## 🐛 Troubleshooting

### Error: "Module not found"

```bash
# Limpiar caché
rm -rf node_modules
pnpm install
```

### Error: "Type error"

```bash
# Verificar TypeScript
pnpm type-check

# Asegúrate de tener todas las deps de tipos
pnpm add -D @types/node @types/react @types/react-dom
```

### Error de ESLint

```bash
# Auto-fix
pnpm lint:fix
```

### Puerto 3000 ocupado

```bash
# Cambiar puerto en vite.config.ts
server: {
  port: 3001,
}
```

## 📦 Build para Producción

```bash
# Compilar
pnpm build

# El output estará en dist/
# Puedes servirlo con cualquier servidor estático

# Preview local del build
pnpm preview
```

## 🚀 Deploy

### Vercel (Recomendado)

```bash
# Instalar CLI
npm i -g vercel

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

### Manual (cualquier hosting)

1. Ejecuta `pnpm build`
2. Sube la carpeta `dist/` a tu servidor
3. Configura tu servidor para servir SPA (todas las rutas → index.html)

## 📚 Siguiente Lectura

1. [README.md](./README.md) - Overview del proyecto
2. [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) - Guía de desarrollo detallada
3. [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Documentación de arquitectura
4. [CONTRIBUTING.md](./CONTRIBUTING.md) - Cómo contribuir

## ❓ FAQ

**P: ¿Por qué usar pnpm?**  
R: Es más rápido, eficiente en espacio y tiene mejor manejo de dependencias.

**P: ¿Puedo usar npm/yarn en vez de pnpm?**  
R: Sí, todos los comandos funcionan igual reemplazando `pnpm` por `npm` o `yarn`.

**P: ¿Necesito configurar algo más?**  
R: Solo el archivo `.env.local` con tus variables de entorno.

**P: ¿Cómo agrego una dependencia?**  
R: `pnpm add nombre-paquete` (o `pnpm add -D` para dev dependencies)

**P: ¿Los hooks de git están configurados?**  
R: Sí, Husky ejecutará lint y format antes de cada commit.

---

**¿Necesitas ayuda?** Abre un issue en GitHub o contacta al equipo de desarrollo.

¡Happy coding! 🎉
