// Servicios y precios breves
const servicios = [
  { nombre: 'Radiografía panorámica', descripcion: 'Imagen completa de la boca y maxilares.', precio: '$6.000' },
  { nombre: 'Radiografías periapicales', descripcion: 'Imágenes detalladas de dientes individuales.', precio: '$2.000' },
  { nombre: 'Radiografías de ATM', descripcion: 'Estudio de la articulación temporomandibular.', precio: '$5.000' },
  { nombre: 'Radiografía carpal', descripcion: 'Radiografía de la muñeca para ortodoncia.', precio: '$3.000' },
  { nombre: 'Telerradiografía de cráneo', descripcion: 'Imagen lateral o frontal del cráneo.', precio: '$4.000' },
  { nombre: 'Tomografía Cone Beam 3D', descripcion: 'Tomografía 3D de alta precisión.', precio: '$18.000' },
  { nombre: 'Digitalización de modelos 3D', descripcion: 'Conversión de modelos físicos a digitales.', precio: '$8.000' },
  { nombre: 'Fotografía intraoral', descripcion: 'Fotos profesionales de la boca.', precio: '$3.500' },
  { nombre: 'Digital Smile Design', descripcion: 'Planificación digital de la sonrisa.', precio: '$10.000' },
  { nombre: 'Guías quirúrgicas', descripcion: 'Dispositivos para cirugías precisas.', precio: '$20.000' },
  { nombre: 'Alineadores removibles', descripcion: 'Ortodoncia estética y removible.', precio: '$25.000 (inicio)' },
];

const infoCior = 'CIOR Imágenes es un centro de diagnóstico por imágenes odontológicas y maxilofaciales en Rosario, Santa Fe. Atención profesional, tecnología avanzada y resultados confiables.';

export function responderCIOR(mensaje: string): string {
  const lower = mensaje.toLowerCase();
  // Saludo institucional
  if (lower.includes('hola') || lower.includes('buenos días') || lower.includes('buenas tardes') || lower.includes('buenas noches')) {
    return '¡Hola! Soy el asistente virtual de CIOR Imágenes. Estoy aquí para ayudarte con información sobre estudios, turnos y servicios.';
  }
  // Info institucional
  if (lower.includes('cior') || lower.includes('quiénes son') || lower.includes('quien sos') || lower.includes('qué hacen') || lower.includes('centro')) {
    return infoCior;
  }
  // Listado de servicios
  if (lower.includes('servicio') || lower.includes('servicios')) {
    return 'Servicios principales: ' + servicios.map(s => s.nombre).join(', ') + '.';
  }
  // Servicio específico
  const match = servicios.find(s => {
    const nombre = s.nombre?.toLowerCase().split(' ')[0] || '';
    return nombre && lower.includes(nombre);
  });
  if (match) {
    return `${match.nombre}: ${match.descripcion} Precio: ${match.precio}`;
  }
  // Default
  return '¿En qué puedo ayudarte sobre CIOR Imágenes?';
}
