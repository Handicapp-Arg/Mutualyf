# 📁 Carpeta de Imágenes

Esta carpeta contiene todos los assets visuales del proyecto CIOR.

## 📂 Estructura

```
public/images/
├── logo/           # Logos de CIOR (diferentes versiones)
├── hero/           # Imágenes para secciones hero
├── services/       # Imágenes de servicios
└── team/           # Fotos del equipo médico
```

## 📋 Formatos Recomendados

### Logos

- **Formato**: SVG (preferido) o PNG con transparencia
- **Nombres**:
  - `logo.svg` - Logo principal
  - `logo-white.svg` - Logo para fondos oscuros
  - `logo-icon.svg` - Icono solamente

### Imágenes Hero

- **Formato**: JPG o WebP
- **Tamaño**: 1920x1080px (Full HD)
- **Peso**: < 300KB (optimizado)

### Servicios

- **Formato**: JPG, PNG o WebP
- **Tamaño**: 800x600px
- **Peso**: < 150KB

### Equipo

- **Formato**: JPG o WebP
- **Tamaño**: 400x400px (cuadrado)
- **Peso**: < 100KB

## 🎨 Cómo Usar las Imágenes

### Opción 1: Desde public/images (Recomendado)

```tsx
// En cualquier componente
<img src="/images/logo/logo.svg" alt="CIOR Logo" />
<img src="/images/hero/scanner.jpg" alt="Scanner dental" />
<img src="/images/services/tomografia.jpg" alt="Tomografía 3D" />
```

### Opción 2: Import directo (para optimización)

```tsx
import logo from '@/../../public/images/logo/logo.svg';

<img src={logo} alt="CIOR Logo" />;
```

## 🖼️ Ejemplos de Uso en Componentes

### Logo en Header

```tsx
// src/components/layout/header.tsx
<img src="/images/logo/logo.svg" alt="CIOR" className="h-12 w-auto" />
```

### Imagen Hero

```tsx
// src/features/home/hero-section.tsx
<img
  src="/images/hero/scanner.jpg"
  alt="Scanner Dental CIOR"
  className="h-full w-full object-cover"
/>
```

### Galería de Servicios

```tsx
const services = [
  { image: '/images/services/tomografia.jpg', title: 'Tomografía 3D' },
  { image: '/images/services/panoramica.jpg', title: 'Panorámica HD' },
  { image: '/images/services/alineadores.jpg', title: 'Alineadores' },
];
```

## ⚡ Optimización

### Herramientas Recomendadas

- **TinyPNG**: https://tinypng.com/ (compresión PNG/JPG)
- **Squoosh**: https://squoosh.app/ (conversor WebP)
- **SVGOMG**: https://jakearchibald.github.io/svgomg/ (optimizar SVG)

### Conversión a WebP (mejor performance)

```bash
# Con herramientas online o instalar cwebp:
cwebp imagen.jpg -o imagen.webp -q 80
```

## 📝 Convenciones de Nombres

- Usar **kebab-case**: `tomografia-3d.jpg`
- Ser **descriptivo**: `hero-scanner-dental.jpg`
- Incluir **versión** si aplica: `logo-v2.svg`

## 🎯 Checklist para Agregar Imágenes

- [ ] Optimizar el peso (< 300KB para hero, < 150KB para otros)
- [ ] Usar nombres descriptivos
- [ ] Colocar en la carpeta correspondiente
- [ ] Agregar atributo `alt` descriptivo en el código
- [ ] Preferir WebP para mejor performance
- [ ] Tener versiones @2x para pantallas retina (opcional)

## 🚀 Lazy Loading

Para imágenes que no están en viewport inicial:

```tsx
<img src="/images/services/tomografia.jpg" alt="Tomografía 3D" loading="lazy" />
```

---

**Nota**: Las imágenes en `public/` son servidas directamente sin procesamiento. Para imágenes que necesitan optimización automática, considera usar un servicio como Cloudinary o imgix.
