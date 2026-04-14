/**
 * Site Configuration - Mutual Luz y Fuerza
 */

export const siteConfig = {
  name: 'Mutual Luz y Fuerza',
  fullName: 'Mutual Luz y Fuerza',
  description: 'Asistente Virtual - Demo',
  url: '',
  github: '',
  contact: {
    phone: '',
    phoneSecondary: '',
    email: '',
    whatsapp: '',
    whatsappDisplay: '',
  },
  schedule: {
    weekdays: 'Lunes a Viernes',
    hours: '08:00 - 18:00 h',
    saturday: 'Cerrado',
    sunday: 'Cerrado',
  },
  locations: [
    {
      id: 1,
      name: 'Mutual Luz y Fuerza',
      address: '',
      city: '',
      province: '',
      postalCode: '',
      fullAddress: '',
      phone: '',
      phoneSecondary: '',
      coordinates: { lat: 0, lng: 0 },
    },
  ],
  socialMedia: {
    facebook: '',
    instagram: '',
    linkedin: '',
  },
} as const;

export type SiteConfig = typeof siteConfig;
