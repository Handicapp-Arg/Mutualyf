# Contribuyendo a CIOR

¡Gracias por tu interés en contribuir al proyecto CIOR! 🎉

## 🚀 Proceso de Desarrollo

### 1. Fork y Clone

```bash
# Fork el repositorio en GitHub
# Luego clona tu fork
git clone https://github.com/TU_USUARIO/app.git
cd app

# Agrega el repositorio original como upstream
git remote add upstream https://github.com/Ciorimagen-ARG/app.git
```

### 2. Crear una Rama

```bash
# Actualiza main
git checkout main
git pull upstream main

# Crea una rama para tu feature
git checkout -b feature/mi-nueva-funcionalidad
```

### 3. Desarrollo

```bash
# Instala dependencias
pnpm install

# Inicia el servidor de desarrollo
pnpm dev

# Ejecuta los tests
pnpm test
```

### 4. Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Ejemplos
git commit -m "feat: agrega componente de calendario"
git commit -m "fix: corrige bug en navegación móvil"
git commit -m "docs: actualiza guía de contribución"
git commit -m "style: formatea código con prettier"
git commit -m "refactor: mejora estructura de hooks"
git commit -m "test: agrega tests para Button"
git commit -m "chore: actualiza dependencias"
```

### 5. Push y Pull Request

```bash
# Push a tu fork
git push origin feature/mi-nueva-funcionalidad

# Crea un Pull Request en GitHub
```

## 📋 Checklist antes de PR

- [ ] El código compila sin errores (`pnpm build`)
- [ ] Los tests pasan (`pnpm test`)
- [ ] No hay errores de linting (`pnpm lint`)
- [ ] El código está formateado (`pnpm format`)
- [ ] Los tipos son correctos (`pnpm type-check`)
- [ ] La funcionalidad está probada manualmente
- [ ] Se agregaron tests si aplica
- [ ] Se actualizó la documentación si aplica
- [ ] El commit sigue Conventional Commits

## 🎨 Estándares de Código

### TypeScript

- Usa tipos explícitos
- Evita `any`, prefiere `unknown`
- Usa interfaces para objetos públicos
- Usa types para uniones y utilidades

```typescript
// ✅ Bien
interface UserProps {
  name: string;
  age: number;
}

// ❌ Mal
const user: any = { name: 'John' };
```

### React

- Componentes funcionales con hooks
- Props tipadas con interfaces
- Usa `memo()` solo cuando sea necesario
- Prefiere composición sobre herencia

```typescript
// ✅ Bien
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
}

export function Button({ children, onClick }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}

// ❌ Mal
export function Button(props: any) {
  return <button>{props.children}</button>;
}
```

### CSS / Tailwind

- Usa utility classes de Tailwind
- Agrupa clases relacionadas
- Usa `cn()` para clases condicionales
- Sigue el orden: layout → display → spacing → sizing → colors → effects

```typescript
// ✅ Bien
<div className={cn(
  'flex items-center gap-4',
  'p-6 rounded-lg',
  'bg-white shadow-lg',
  isActive && 'border-2 border-blue-500'
)} />

// ❌ Mal
<div className="bg-white flex p-6 rounded-lg shadow-lg items-center gap-4" />
```

## 🧪 Tests

```typescript
// Nombra los tests descriptivamente
describe('Button', () => {
  it('renders children correctly', () => {
    // ...
  });
  
  it('calls onClick when clicked', () => {
    // ...
  });
  
  it('applies custom className', () => {
    // ...
  });
});
```

## 📝 Documentación

### JSDoc en Componentes

```typescript
/**
 * Componente Button principal del sistema de diseño
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="lg" onClick={handleClick}>
 *   Click me
 * </Button>
 * ```
 */
export function Button({ ... }) {
  // ...
}
```

### README para Features

Cada feature compleja debe tener su README:

```markdown
# Mi Feature

## Descripción
...

## Uso
...

## API
...
```

## 🐛 Reportar Bugs

Usa el template de issues:

**Describe el bug**
Una descripción clara del problema.

**Para Reproducir**
Pasos para reproducir:
1. Ir a '...'
2. Click en '....'
3. Scroll hasta '....'
4. Ver error

**Comportamiento esperado**
Qué esperabas que sucediera.

**Screenshots**
Si aplica, agrega screenshots.

**Contexto**
- OS: [e.g. Windows 11]
- Browser: [e.g. Chrome 120]
- Node version: [e.g. 20.0.0]

## 💡 Sugerir Features

Usa el template de feature request:

**¿El feature está relacionado a un problema?**
Descripción clara del problema.

**Describe la solución que te gustaría**
Descripción clara de lo que quieres que suceda.

**Alternativas consideradas**
Otras soluciones o features que consideraste.

**Contexto adicional**
Cualquier otro contexto o screenshots.

## 📞 Contacto

- GitHub Issues: [Ciorimagen-ARG/app/issues](https://github.com/Ciorimagen-ARG/app/issues)
- Email: dev@cior.com.ar

## 📜 Código de Conducta

Este proyecto adhiere a un Código de Conducta. Al participar, se espera que lo cumplas.

### Nuestros Estándares

- Usar lenguaje acogedor e inclusivo
- Ser respetuoso con diferentes puntos de vista
- Aceptar críticas constructivas con gracia
- Enfocarse en lo mejor para la comunidad
- Mostrar empatía hacia otros miembros

---

¡Gracias por contribuir a CIOR! 🙏
