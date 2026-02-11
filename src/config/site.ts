/**
 * Site Configuration - CIOR
 */

export const siteConfig = {
  name: 'CIOR',
  fullName: 'Centro de Imágenes y Odontología Radiológica',
  description:
    'Centro de excelencia en imágenes odontológicas con tecnología de escaneo volumétrico 3D.',
  url: 'https://cior.com.ar',
  github: 'https://github.com/Ciorimagen-ARG/app',
  contact: {
    phone: '+54 11 4567-8900',
    email: 'info@cior.com.ar',
    whatsapp: '+5491123456789',
  },
  locations: [
    {
      id: 1,
      name: 'CIOR Belgrano',
      address: 'Av. Cabildo 1234, CABA',
      phone: '+54 11 4567-8900',
      coordinates: { lat: -34.5631, lng: -58.4548 },
    },
    // Agregar más sedes según sea necesario
  ],
  socialMedia: {
    facebook: 'https://facebook.com/cior',
    instagram: 'https://instagram.com/cior',
    linkedin: 'https://linkedin.com/company/cior',
  },
} as const;

export type SiteConfig = typeof siteConfig;
