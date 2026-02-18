# Sistema de Validación de Órdenes Médicas

## 📋 Descripción General

Sistema completo para la carga, validación y gestión de órdenes médicas a través del chatbot Nexus.

## 🎯 Características Implementadas

### 1. **Validación de Archivos (Frontend)**

- ✅ Formatos permitidos: PDF, JPG, PNG
- ✅ Tamaño máximo: 5MB
- ✅ Validación antes de procesar

### 2. **Validación de Datos del Paciente**

- ✅ DNI obligatorio (7-8 dígitos)
- ✅ Nombre completo
- ✅ Teléfono de contacto (mínimo 10 dígitos)
- ✅ Verificación de DNI previo en el sistema

### 3. **Validación de la Orden Médica**

- ✅ Fecha de emisión (no mayor a 6 meses)
- ✅ Fecha no puede ser futura
- ✅ Nombre del médico solicitante
- ✅ Matrícula del médico (opcional)
- ✅ Obra social / Prepaga (opcional)
- ✅ Al menos un estudio solicitado

### 4. **Base de Datos (Prisma)**

- ✅ Tabla `medical_orders` con todos los campos necesarios
- ✅ Estados de validación: pending, validated, rejected
- ✅ Tracking de quién validó y cuándo
- ✅ Índices para búsquedas eficientes

## 🔄 Flujo de Usuario

1. **Usuario inicia chat** → Chatbot saluda
2. **Usuario menciona turno/estudio** → Chatbot pide DNI (si no lo tiene)
3. **Usuario proporciona DNI** → Se guarda en localStorage
4. **Usuario hace clic en "Subir orden médica"**
5. **Selecciona archivo** → Validación de tipo y tamaño
6. **Se abre formulario modal** con:
   - Datos pre-llenados (DNI y nombre)
   - Campos a completar:
     - Teléfono
     - Fecha de la orden
     - Médico solicitante
     - Matrícula (opcional)
     - Obra social (opcional)
     - Estudios solicitados
7. **Validación en tiempo real**:
   - Campos requeridos marcados con \*
   - Mensajes de error descriptivos
   - Validación de formato
8. **Usuario confirma** → Se envía al backend
9. **Backend valida** y guarda en base de datos
10. **Respuesta exitosa** → Mensaje con número de orden

## 📁 Estructura de Archivos

### Backend

```
chill-back/
├── prisma/
│   └── schema.prisma                    # Modelo MedicalOrder
├── src/
│   └── modules/
│       └── uploads/
│           ├── uploads.controller.ts    # Endpoints de órdenes
│           ├── uploads.service.ts       # Lógica de validación
│           ├── uploads.module.ts        # Módulo de uploads
│           └── dto/
│               └── medical-order.dto.ts # DTOs de validación
```

### Frontend

```
src/
├── features/
│   └── nexus-bot/
│       ├── chat-interface.tsx           # Chat principal
│       └── medical-order-form.tsx       # Formulario de validación
└── services/
    └── backend-api.service.ts           # Comunicación con backend
```

## 🔗 Endpoints del Backend

### `POST /api/uploads/medical-order`

Subir y validar orden médica

**Body (FormData):**

```typescript
{
  file: File,
  sessionId: string,
  patientDNI: string,
  patientName: string,
  patientPhone: string,
  orderDate: string,           // YYYY-MM-DD
  doctorName: string,
  doctorLicense?: string,
  healthInsurance?: string,
  requestedStudies: string[]   // JSON array
}
```

**Response:**

```json
{
  "success": true,
  "message": "Orden médica registrada exitosamente",
  "data": {
    "orderId": 123,
    "status": "pending"
  }
}
```

### `GET /api/uploads/medical-orders`

Obtener todas las órdenes (últimas 100)

### `GET /api/uploads/medical-orders/dni/:dni`

Obtener órdenes por DNI del paciente

### `PUT /api/uploads/medical-orders/validate`

Validar o rechazar una orden

**Body:**

```json
{
  "orderId": "123",
  "validationStatus": "validated", // o "rejected"
  "validatedBy": "admin@cior.com",
  "rejectionReason": "..." // Si fue rechazada
}
```

## ✅ Validaciones Implementadas

### Archivo

- ✅ Tipo MIME: `image/jpeg`, `image/png`, `application/pdf`
- ✅ Tamaño: máximo 5MB
- ✅ Existencia del archivo

### DNI

- ✅ Formato: 7-8 dígitos numéricos
- ✅ Patrón regex: `/^\d{7,8}$/`

### Fecha de Orden

- ✅ No puede ser futura
- ✅ No puede tener más de 6 meses de antigüedad
- ✅ Formato válido (ISO date)

### Teléfono

- ✅ Mínimo 10 dígitos
- ✅ Solo números

### Estudios Solicitados

- ✅ Al menos un estudio
- ✅ Array no vacío

## 🎨 UX del Formulario

- **Header llamativo** con degradado corporativo
- **Indicador de archivo cargado** con tamaño
- **Sección de datos del paciente** pre-llenada (solo lectura)
- **Validación en tiempo real** con mensajes de error
- **Íconos descriptivos** para cada campo
- **Botones grandes** y accesibles
- **Modal overlay** con fondo oscuro
- **Responsive** y mobile-friendly

## 🔐 Seguridad

- ✅ Validación en backend (nunca confiar solo en frontend)
- ✅ Tamaño de archivo limitado (DoS prevention)
- ✅ Tipos MIME validados
- ✅ Sanitización de nombres de archivo
- ✅ Nombres de archivo aleatorios (evitar colisiones)
- ✅ Validación de DTOs con class-validator

## 📊 Estado de Validación

Las órdenes pueden tener 3 estados:

1. **`pending`** (default): Orden recibida, esperando validación
2. **`validated`**: Orden aprobada por administrador
3. **`rejected`**: Orden rechazada con motivo

## 🔄 Próximas Mejoras (Opcionales)

### OCR (Reconocimiento Óptico de Caracteres)

- Integrar Tesseract.js o Google Vision API
- Extraer automáticamente:
  - DNI del paciente
  - Nombre del médico
  - Matrícula
  - Estudios solicitados
- Pre-llenar formulario con datos extraídos

### Notificaciones

- Email al paciente cuando la orden es validada
- SMS de confirmación
- Recordatorio de turno

### Admin Panel

- Vista de órdenes pendientes
- Botones de aprobación/rechazo
- Visualizador de archivos
- Histórico de validaciones

### Integraciones

- Sistema de turnos automático
- Verificación de médicos contra registro nacional
- Validación de obra social en PAMI/Superintendencia

## 🐛 Troubleshooting

### "Formato de archivo no válido"

- Asegurarse de que el archivo sea PDF, JPG o PNG
- Verificar que el MIME type sea correcto

### "La orden es muy antigua"

- La fecha no puede superar los 6 meses
- Solicitar orden médica actualizada

### "DNI inválido"

- Debe tener 7 u 8 dígitos
- Solo números, sin puntos ni espacios

### "Error al subir la orden"

- Verificar que el backend esté corriendo
- Verificar conexión a internet
- Revisar logs del servidor

## 📞 Contacto

Para dudas o soporte, contactar al equipo de desarrollo.
