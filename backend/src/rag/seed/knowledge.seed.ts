export interface SeedDoc {
  title: string;
  source: string;
  category: string;
  content: string;
}

/**
 * Knowledge base inicial de MutuaLyF, derivada del system prompt previo.
 * Dividida por categoría para permitir retrieval filtrado.
 */
export const KNOWLEDGE_SEED: SeedDoc[] = [
  {
    title: 'Identificación institucional',
    source: 'seed:identidad-v1',
    category: 'general',
    content: `MutuaLyF es la Mutual Provincial de Luz y Fuerza de Santa Fe, una entidad solidaria de salud creada en 1999.

Tipo de entidad: Mutual de salud.
Destinatarios: afiliados al sindicato Luz y Fuerza y su grupo familiar directo.
Cobertura geográfica: Provincia de Santa Fe, con red de prestadores en todo el país mediante derivaciones.
Misión: brindar atención médica y prestaciones de salud a sus asociados bajo un modelo mutualista.`,
  },
  {
    title: 'Horarios de atención',
    source: 'seed:horarios-v1',
    category: 'contact',
    content: `Horarios de atención de MutuaLyF:

- Atención telefónica: lunes a viernes de 07:30 a 19:30 hs.
- Atención online a través de la plataforma digital MiMutuaLyF: 24 horas, todos los días.
- Atención presencial: en sedes administrativas, dentro del horario laboral habitual.

Fuera del horario de atención telefónica, los afiliados pueden iniciar trámites por la plataforma MiMutuaLyF.`,
  },
  {
    title: 'Canales de contacto',
    source: 'seed:contacto-v1',
    category: 'contact',
    content: `Canales de contacto oficiales de MutuaLyF:

- Teléfono: 0800 777 4413 (lunes a viernes de 07:30 a 19:30 hs).
- WhatsApp: canal habilitado únicamente para mensajería (no llamadas).
- Plataforma digital MiMutuaLyF: acceso web, disponible 24 hs.
- Sedes presenciales: en horario laboral.

Para cualquier consulta urgente, el canal recomendado es el 0800 777 4413.`,
  },
  {
    title: 'Plataforma digital MiMutuaLyF',
    source: 'seed:plataforma-v1',
    category: 'platform',
    content: `MiMutuaLyF es el sistema de autogestión digital para afiliados, accesible desde la web las 24 horas.

Funciones disponibles:
- Solicitud de órdenes médicas digitales.
- Gestión de autorizaciones para prácticas y estudios.
- Seguimiento del estado de trámites y solicitudes.
- Consulta de información personal y del grupo familiar.
- Pago de coseguros online.
- Descarga de recetas y documentación.

Siempre se recomienda usar MiMutuaLyF antes de llamar por teléfono, ya que la mayoría de los trámites se resuelven online.`,
  },
  {
    title: 'Servicios de salud y especialidades',
    source: 'seed:servicios-v1',
    category: 'services',
    content: `MutuaLyF brinda servicios de atención médica general y especializada mediante centro médico propio y red de profesionales externos.

Especialidades cubiertas:
- Clínica médica
- Pediatría
- Ginecología
- Cardiología
- Salud mental y Psicología
- Nutrición
- Odontología
- Oftalmología

Modalidad: libre elección dentro del padrón de prestadores habilitados.
Internaciones: cobertura de internaciones médicas y quirúrgicas, coordinadas con sanatorios y clínicas de la red.
Consultas médicas: generales y en especialidades, por orden médica o turno según el caso.`,
  },
  {
    title: 'Medicamentos y vademécum',
    source: 'seed:medicamentos-v1',
    category: 'meds',
    content: `Cobertura de medicamentos en MutuaLyF:

- La cobertura depende del plan del afiliado y se basa en el vademécum oficial.
- Tipos de medicación cubierta: medicación general, para enfermedades crónicas y medicación de alto costo.
- Receta digital obligatoria: no se utilizan recetas en papel.
- Algunos medicamentos requieren autorización previa.
- En tratamientos prolongados se requiere seguimiento médico.
- En tratamientos crónicos se permite hasta 3 recetas por consulta.

Para consultar si un medicamento específico está cubierto, el afiliado debe ingresar a MiMutuaLyF o llamar al 0800 777 4413.`,
  },
  {
    title: 'Recetas y órdenes médicas',
    source: 'seed:recetas-ordenes-v1',
    category: 'procedure',
    content: `Recetas y órdenes médicas en MutuaLyF:

- Formato: EXCLUSIVAMENTE digital. No se utilizan recetas ni órdenes en papel.
- Emisión: por profesionales habilitados del padrón.
- Recetas en tratamientos crónicos: hasta 3 recetas por consulta.
- Órdenes médicas: requeridas para prácticas, estudios e internaciones; se gestionan por MiMutuaLyF o por los canales oficiales.
- Validación: las órdenes pueden requerir autorización previa según la práctica solicitada.

Los afiliados pueden subir órdenes médicas desde el chat o desde la plataforma MiMutuaLyF para iniciar su validación.`,
  },
  {
    title: 'Trámites administrativos',
    source: 'seed:tramites-v1',
    category: 'procedure',
    content: `Tipos de trámites administrativos disponibles en MutuaLyF:

- Autorizaciones de prácticas, estudios e internaciones.
- Reintegros por prestaciones realizadas fuera de la red.
- Solicitudes de cobertura especial.
- Presentación de documentación médica.
- Altas y modificaciones del grupo familiar.

Modalidades de gestión:
- Online: a través de la plataforma MiMutuaLyF (recomendado).
- Telefónica: al 0800 777 4413 en horario de atención.
- Presencial: en sedes administrativas durante horario laboral.`,
  },
  {
    title: 'Pagos y coseguros',
    source: 'seed:pagos-v1',
    category: 'payments',
    content: `Pagos y coseguros en MutuaLyF:

Medios de pago aceptados:
- Tarjetas de crédito y débito.
- Mercado Pago.
- Santa Fe Servicios.
- Bono Link.
- Pago presencial en sedes.

Consideraciones:
- El coseguro es un pago parcial que realiza el afiliado por ciertas prestaciones; su monto depende del tipo de práctica.
- Algunos servicios requieren pago previo para acceder a la prestación.
- Los coseguros pueden abonarse online desde MiMutuaLyF.`,
  },
  {
    title: 'Flujo general de atención',
    source: 'seed:flujo-v1',
    category: 'procedure',
    content: `Flujo típico de atención para un afiliado de MutuaLyF:

1. El afiliado realiza la consulta médica con un profesional del padrón.
2. El profesional emite receta u orden médica en formato digital.
3. Si la práctica lo requiere, se gestiona la autorización (online o telefónica).
4. El afiliado accede a la práctica o a la medicación indicada.
5. Se abona el coseguro correspondiente según la prestación.

Recomendación general: usar siempre MiMutuaLyF como primer canal; si no se resuelve, llamar al 0800 777 4413.`,
  },
  {
    title: 'Reglas importantes del asistente',
    source: 'seed:reglas-asistente-v1',
    category: 'general',
    content: `Reglas importantes a tener en cuenta al informar a un afiliado:

- No se inventan datos de contacto, direcciones ni información que no esté en la base de conocimiento.
- Ante cualquier duda o consulta que exceda la información disponible, el afiliado debe comunicarse al 0800 777 4413.
- El asistente NO agenda turnos directamente; los turnos se gestionan con el prestador o por MiMutuaLyF.
- Siempre se recomienda la autogestión vía plataforma MiMutuaLyF cuando sea posible.
- Las recetas y órdenes médicas son EXCLUSIVAMENTE digitales.`,
  },
];
