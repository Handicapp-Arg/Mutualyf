# Chill Frontend - React + Vite

Frontend del chatbot con React, TypeScript y TailwindCSS.

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev

# Construir para producción
npm run build
```

## 📦 Dependencias Principales

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **@fingerprintjs/fingerprintjs** - User identification

## 🔌 Integración con Backend

El frontend se comunica con el backend NestJS a través de:

**Base URL**: `http://localhost:3001/api`

**Cliente HTTP**: `src/services/databaseApiService.ts`

### Servicios principales:

- `ollamaService.ts` - Integración con Ollama (AI local)
- `aiOrchestrator.ts` - Coordinación de múltiples proveedores AI
- `databaseApiService.ts` - Cliente HTTP para backend
- `UserIdentificationSystem.ts` - Identificación de usuarios

## 🎨 Estructura

```
src/
├── components/          # Componentes React
│   ├── MessageBubble.tsx
│   ├── UserIndicator.tsx
│   └── ...
├── config/              # Configuración
│   ├── systemInstructions_final.ts
│   └── marketingTemplates.ts
├── services/            # Servicios
│   ├── ollamaService.ts
│   ├── aiOrchestrator.ts
│   └── databaseApiService.ts
├── infrastructure/      # Sistemas de soporte
│   └── user/
│       └── UserIdentificationSystem.ts
├── hooks/               # React hooks
├── types/               # TypeScript types
└── utils/               # Utilidades
```

## 🤖 Integración AI

El frontend soporta múltiples proveedores de AI con fallback automático:

1. **Ollama** (Primary) - Local, gratuito
2. **Gemini 2.5 Flash** (Fallback)
3. **Groq** (Fallback)

### Configuración

Variables de entorno en `.env`:

```bash
VITE_GEMINI_API_KEY=tu_key_aqui
VITE_GROQ_API_KEY=tu_key_aqui
```

## 🔧 Scripts

```bash
npm run dev      # Desarrollo (puerto 5173)
npm run build    # Build producción
npm run preview  # Preview build
```

## 🌐 Puerto

Por defecto: **5173** (Vite puede usar otro si está ocupado)
