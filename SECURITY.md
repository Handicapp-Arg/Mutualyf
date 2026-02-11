# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

Si descubres una vulnerabilidad de seguridad, por favor **NO** abras un issue público.

En su lugar:

1. **Email**: Envía los detalles a security@cior.com.ar
2. **Incluye**:
   - Descripción del problema
   - Pasos para reproducir
   - Versión afectada
   - Posible impacto
   - Solución sugerida (si la tienes)

### Qué esperar

- **Respuesta inicial**: Dentro de 48 horas
- **Evaluación**: Dentro de 7 días
- **Fix y release**: Según severidad (crítico: 1-3 días, alto: 1 semana, medio: 2 semanas)

## Mejores Prácticas de Seguridad

### Variables de Entorno

- **NUNCA** commitees archivos `.env`
- Usa `.env.example` como template
- Rota secrets regularmente

### Dependencias

- Revisa dependencias regularmente: `pnpm audit`
- Actualiza paquetes con vulnerabilidades conocidas
- Usa `pnpm update` con precaución

### Autenticación

- Implementa rate limiting
- Usa tokens JWT con expiración
- Implementa 2FA cuando sea posible

### Data Sanitization

- Valida todos los inputs con Zod
- Sanitiza outputs para prevenir XSS
- Usa prepared statements para SQL

## Cumplimiento

Este proyecto cumple con:

- GDPR (General Data Protection Regulation)
- HIPAA (Health Insurance Portability and Accountability Act)
- Ley de Protección de Datos Personales Argentina (Ley 25.326)

---

**Última actualización**: Febrero 2026
