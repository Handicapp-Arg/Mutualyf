/**
 * Site Configuration - CIOR
 */

export const siteConfig = {
  name: 'CIOR',
  fullName: 'Centro de Imágenes y Odontología Radiológica',
  description:
    'Centro de excelencia en imágenes odontológicas con tecnología de escaneo volumétrico 3D.',
  url: 'https://www.ciorimagenes.com.ar',
  github: 'https://github.com/Ciorimagen-ARG/app',
  contact: {
    phone: '0341 425-8501',
    phoneSecondary: '0341 421-1408',
    email: 'contacto@ciorimagenes.com.ar',
    whatsapp: '+5493413017960',
    whatsappDisplay: '341 301-7960',
  },
  schedule: {
    weekdays: 'Lunes a Viernes',
    hours: '08:00 - 19:00 h',
    saturday: 'Cerrado',
    sunday: 'Cerrado',
  },
  locations: [
    {
      id: 1,
      name: 'CIOR Rosario',
      address: 'Balcarce 1001',
      city: 'Rosario',
      province: 'Santa Fe',
      postalCode: '2000',
      fullAddress: 'Balcarce 1001, 2000 Rosario',
      phone: '0341 425-8501',
      phoneSecondary: '0341 421-1408',
      coordinates: { lat: -32.9442, lng: -60.6505 },
    },
  ],
  socialMedia: {
    facebook: 'https://facebook.com/cior',
    instagram: 'https://instagram.com/cior',
    linkedin: 'https://linkedin.com/company/cior',
  },
} as const;

export type SiteConfig = typeof siteConfig;
