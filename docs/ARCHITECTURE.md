# Arquitectura CIOR - Documentación Técnica

## 📐 Visión General

CIOR sigue una arquitectura **modular basada en features** con separación clara de responsabilidades, escalabilidad horizontal y vertical, y principios SOLID.

## 🏗️ Patrones Arquitectónicos

### 1. Feature-Based Architecture

Cada feature es un módulo auto-contenido:

```
features/
└── nexus-bot/
    ├── index.ts              # Public API
    ├── nexus-bot.tsx         # Main component
    ├── components/           # Internal components
    ├── hooks/                # Feature-specific hooks
    ├── utils/                # Feature utilities
    └── types.ts              # Feature types
```

**Beneficios**:
- ✅ Alto cohesión, bajo acoplamiento
- ✅ Fácil de testear
- ✅ Reutilizable
- ✅ Escalable

### 2. Presentational vs Container Pattern

```typescript
// Container (lógica)
function UserProfileContainer() {
  const { data, loading } = useUser();
  
  if (loading) return <Spinner />;
  return <UserProfile user={data} />;
}

// Presentational (UI pura)
function UserProfile({ user }: { user: User }) {
  return <div>{user.name}</div>;
}
```

### 3. Composition Pattern

```typescript
// Componentes componibles
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>
    Contenido
  </CardContent>
</Card>
```

## 🗂️ Estructura de Directorios

### `/src/components`

**Propósito**: Componentes UI reutilizables

```
components/
├── ui/                    # Sistema de diseño base
│   ├── button.tsx
│   ├── card.tsx
│   └── badge.tsx
└── layout/                # Componentes de estructura
    ├── header.tsx
    ├── footer.tsx
    └── nav-dropdown.tsx
```

**Reglas**:
- Sin lógica de negocio
- Altamente reutilizables
- Props tipadas estrictamente
- Documentados con JSDoc

### `/src/features`

**Propósito**: Features organizadas por dominio

```
features/
├── nexus-bot/             # Asistente virtual
├── patient-portal/        # Portal del paciente
└── services/              # Catálogo de servicios
```

**Reglas**:
- Auto-contenidas
- Exportan API pública vía `index.ts`
- Pueden usar `components/ui`
- NO dependen de otras features

### `/src/hooks`

**Propósito**: Custom hooks compartidos

```
hooks/
├── use-scrolled.ts
├── use-media-query.ts
└── index.ts
```

**Reglas**:
- Prefijo `use`
- Reutilizables
- Sin side effects globales
- Bien testeados

### `/src/lib`

**Propósito**: Utilities y helpers

```
lib/
├── utils.ts               # Helpers generales
├── api.ts                 # Cliente API
└── constants.ts           # Constantes
```

### `/src/config`

**Propósito**: Configuraciones

```
config/
├── site.ts                # Config del sitio
├── design-tokens.ts       # Tokens de diseño
└── env.ts                 # Variables de entorno
```

### `/src/types`

**Propósito**: Definiciones de tipos TypeScript

```
types/
├── index.ts               # Tipos globales
├── api.ts                 # Tipos de API
└── models.ts              # Modelos de datos
```

## 🔄 Flujo de Datos

```
Usuario → Evento → Handler → Hook → State → UI Update
```

### Ejemplo Completo

```typescript
// 1. Usuario hace click
<Button onClick={handleUpload}>Upload</Button>

// 2. Handler procesa
function handleUpload() {
  const file = selectFile();
  uploadOrder(file);
}

// 3. Hook maneja estado
function useOrderUpload() {
  const [status, setStatus] = useState('idle');
  
  const upload = async (file: File) => {
    setStatus('uploading');
    await api.upload(file);
    setStatus('success');
  };
  
  return { upload, status };
}

// 4. UI refleja cambio
{status === 'uploading' && <Spinner />}
{status === 'success' && <Success />}
```

## 🎯 Principios de Diseño

### 1. Single Responsibility

Cada componente/función tiene UNA responsabilidad.

```typescript
// ✅ Bien - Una responsabilidad
function UserName({ name }: { name: string }) {
  return <span>{name}</span>;
}

// ❌ Mal - Múltiples responsabilidades
function UserProfile({ user }) {
  // Fetch data
  // Format data
  // Render UI
  // Handle events
}
```

### 2. Open/Closed Principle

Abierto para extensión, cerrado para modificación.

```typescript
// ✅ Extensible vía props
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

// Agregar nuevo variant sin modificar código existente
<Button variant="ghost" />
```

### 3. Dependency Inversion

Depende de abstracciones, no de implementaciones.

```typescript
// ✅ Bien - Inyección de dependencia
function UserList({ fetchUsers }: { fetchUsers: () => Promise<User[]> }) {
  // ...
}

// ❌ Mal - Dependencia hardcodeada
function UserList() {
  const users = await api.getUsers(); // Acoplado a implementación
}
```

## 🧩 Patrones de Componentes

### Compound Components

```typescript
export function Card({ children }: { children: React.ReactNode }) {
  return <div className="card">{children}</div>;
}

Card.Header = function CardHeader({ children }) {
  return <div className="card-header">{children}</div>;
};

Card.Body = function CardBody({ children }) {
  return <div className="card-body">{children}</div>;
};

// Uso
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
</Card>
```

### Render Props

```typescript
function DataFetcher({ 
  url, 
  children 
}: { 
  url: string; 
  children: (data: any) => React.ReactNode;
}) {
  const { data, loading } = useFetch(url);
  
  if (loading) return <Spinner />;
  return children(data);
}

// Uso
<DataFetcher url="/api/users">
  {(users) => <UserList users={users} />}
</DataFetcher>
```

### Custom Hooks

```typescript
function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  
  const toggle = () => setValue((v) => !v);
  const setTrue = () => setValue(true);
  const setFalse = () => setValue(false);
  
  return { value, toggle, setTrue, setFalse };
}

// Uso
function Modal() {
  const modal = useToggle();
  
  return (
    <>
      <Button onClick={modal.setTrue}>Open</Button>
      {modal.value && <ModalContent onClose={modal.setFalse} />}
    </>
  );
}
```

## 🔐 Gestión de Estado

### Nivel 1: Local State (useState)

Para estado del componente.

```typescript
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### Nivel 2: URL State (react-router)

Para estado que debe persistir en URL.

```typescript
function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  return <input value={query} onChange={e => 
    setSearchParams({ q: e.target.value })
  } />;
}
```

### Nivel 3: Global State (Zustand)

Para estado compartido entre componentes.

```typescript
const useStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

## 📊 Performance

### Code Splitting

```typescript
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Memoization

```typescript
// Componente
const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  return <div>{/* render expensive UI */}</div>;
});

// Valor
const expensiveValue = useMemo(() => computeExpensive(data), [data]);

// Callback
const handleClick = useCallback(() => {
  doSomething();
}, []);
```

## 🔍 Error Handling

### Error Boundaries

```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

### Try/Catch en Async

```typescript
async function fetchData() {
  try {
    const data = await api.getData();
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
```

## 📚 Referencias

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [React Patterns](https://reactpatterns.com/)

---

**Mantenido por**: Equipo de Arquitectura CIOR  
**Última actualización**: Febrero 2026
