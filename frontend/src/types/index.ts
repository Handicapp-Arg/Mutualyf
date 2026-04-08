/**
 * Type Definitions - CIOR
 */

export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'imaging' | 'orthodontics' | 'diagnostics';
  features?: string[];
}

export interface Location {
  id: number;
  name: string;
  address: string;
  phone: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface ContactInfo {
  phone: string;
  email: string;
  whatsapp: string;
}

export interface BotMessage {
  id: string;
  content: string;
  type: 'bot' | 'user';
  timestamp: Date;
}

export interface PatientOrder {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  uploadedAt: Date;
}
