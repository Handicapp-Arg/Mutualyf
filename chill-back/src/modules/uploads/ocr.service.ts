import { Injectable, Logger } from '@nestjs/common';
import * as Tesseract from 'tesseract.js';
const pdfParse = require('pdf-parse');
import sharp from 'sharp';
import * as fs from 'fs/promises';
import { OllamaService } from '../../ai/ollama.service';
import { GeminiService } from '../../ai/gemini.service';

export interface OCRResult {
  text: string;
  confidence: number;
}

export interface ExtractedMedicalData {
  patientDNI: { value: string; confidence: number };
  patientName: { value: string; confidence: number };
  orderDate: { value: string; confidence: number };
  doctorName: { value: string; confidence: number };
  doctorLicense: { value: string; confidence: number };
  healthInsurance: { value: string; confidence: number };
  requestedStudies: { value: string[]; confidence: number };
}

@Injectable()
export class OCRService {
  private readonly logger = new Logger(OCRService.name);

  constructor(
    private readonly ollamaService: OllamaService,
    private readonly geminiService: GeminiService
  ) {}

  /**
   * Extraer texto de PDF
   */
  async extractTextFromPDF(filePath: string): Promise<OCRResult> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data: any = await pdfParse(dataBuffer);

      return {
        text: data.text,
        confidence: 0.9, // PDFs generalmente tienen alta confianza
      };
    } catch (error: any) {
      this.logger.error(`Error extrayendo texto de PDF: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extraer texto de imagen usando OCR con mejoras
   */
  async extractTextFromImage(filePath: string): Promise<OCRResult> {
    try {
      // Optimizar imagen AGRESIVAMENTE para mejor OCR con letra manuscrita
      const optimizedBuffer = await sharp(filePath)
        .resize(3000, null, { withoutEnlargement: false }) // Aumentar resolución
        .grayscale()
        .normalize() // Mejorar contraste
        .threshold(128) // Binarización para separar texto del fondo
        .sharpen({ sigma: 2 }) // Sharpen más agresivo
        .toBuffer();

      // Ejecutar OCR con configuración mejorada
      const result = await Tesseract.recognize(optimizedBuffer, 'spa', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            this.logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      return {
        text: result.data.text,
        confidence: result.data.confidence / 100,
      };
    } catch (error) {
      this.logger.error(`Error extrayendo texto de imagen: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extraer texto según tipo de archivo
   */
  async extractText(filePath: string, mimeType: string): Promise<OCRResult> {
    this.logger.debug(`Extrayendo texto de ${filePath} (${mimeType})`);

    if (mimeType === 'application/pdf') {
      return this.extractTextFromPDF(filePath);
    } else {
      return this.extractTextFromImage(filePath);
    }
  }

  /**
   * Analizar texto y extraer datos médicos
   */
  analyzeMedicalData(text: string): ExtractedMedicalData {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    return {
      patientDNI: this.extractDNI(text),
      patientName: this.extractPatientName(text, lines),
      orderDate: this.extractDate(text),
      doctorName: this.extractDoctorName(text, lines),
      doctorLicense: this.extractDoctorLicense(text),
      healthInsurance: this.extractHealthInsurance(text),
      requestedStudies: this.extractStudies(text, lines),
    };
  }

  /**
   * Extraer DNI (7-8 dígitos) - MEJORADO con más patrones
   */
  private extractDNI(text: string): { value: string; confidence: number } {
    const dniPatterns = [
      /DNI[\s:\.]*(\d{7,8})/i,
      /D\.?\s*N\.?\s*I\.?[\s:\.]*(\d{7,8})/i,
      /documento[\s:\.]*(\d{7,8})/i,
      /doc[\s:\.]+(\d{7,8})/i,
      /identificaci[óo]n[\s:\.]*(\d{7,8})/i,
      // Buscar números de 7-8 dígitos cerca de palabras clave
      /(?:paciente|titular|afiliado)[\s\S]{0,30}?(\d{7,8})/i,
      // Números aislados de 7-8 dígitos (última opción)
      /\b(\d{7,8})\b/,
    ];

    for (const pattern of dniPatterns) {
      const matches = text.matchAll(new RegExp(pattern, 'gi'));
      for (const match of matches) {
        const dni = match[1];
        if (dni && dni.length >= 7 && dni.length <= 8) {
          // Validar que no sea un teléfono (no empieza con 11, 15, etc)
          if (!dni.startsWith('11') && !dni.startsWith('15')) {
            return { value: dni, confidence: 0.85 };
          }
        }
      }
    }

    return { value: '', confidence: 0 };
  }

  /**
   * Extraer nombre del paciente - MEJORADO con fuzzy matching
   */
  private extractPatientName(
    text: string,
    lines: string[]
  ): { value: string; confidence: number } {
    const namePatterns = [
      /paciente[\s:\.]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/i,
      /apellido[s]?[\s:\.]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)\s*,?\s*nombre[s]?[\s:\.]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/i,
      /nombre[s]?[\s:\.]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)\s*apellido[s]?[\s:\.]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/i,
      /nombre\s+completo[\s:\.]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/i,
      /titular[\s:\.]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/i,
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match) {
        // Si tiene apellido y nombre separados, combinar
        if (match[2]) {
          return { value: `${match[1].trim()} ${match[2].trim()}`, confidence: 0.8 };
        }
        return { value: match[1].trim(), confidence: 0.75 };
      }
    }

    // Buscar en las primeras 8 líneas (más tolerante)
    for (let i = 0; i < Math.min(8, lines.length); i++) {
      const line = lines[i].trim();
      // Patrón de nombre: 2-4 palabras capitalizadas
      if (line.match(/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3}$/)) {
        // Verificar que no sea un título médico
        if (
          !line.toLowerCase().includes('doctor') &&
          !line.toLowerCase().includes('clinica') &&
          !line.toLowerCase().includes('hospital')
        ) {
          return { value: line, confidence: 0.6 };
        }
      }
    }

    return { value: '', confidence: 0 };
  }

  /**
   * Extraer fecha de la orden
   */
  private extractDate(text: string): { value: string; confidence: number } {
    const datePatterns = [
      /fecha[\s:]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/,
      /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[1];
        const date = this.parseDate(dateStr);
        if (date) {
          return { value: date, confidence: 0.8 };
        }
      }
    }

    return { value: '', confidence: 0 };
  }

  /**
   * Parsear fecha a formato ISO
   */
  private parseDate(dateStr: string): string | null {
    try {
      const parts = dateStr.split(/[\/\-]/);
      let day, month, year;

      if (parts[0].length === 4) {
        // YYYY-MM-DD
        [year, month, day] = parts;
      } else {
        // DD/MM/YYYY o MM/DD/YYYY
        [day, month, year] = parts;
      }

      if (year.length === 2) {
        year = '20' + year;
      }

      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  /**
   * Extraer nombre del médico
   */
  private extractDoctorName(
    text: string,
    lines: string[]
  ): { value: string; confidence: number } {
    const doctorPatterns = [
      /(?:dr|dra|doctor|doctora)[\s.]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)/i,
      /m[ée]dico[\s:]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)/i,
      /solicitante[\s:]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)/i,
    ];

    for (const pattern of doctorPatterns) {
      const match = text.match(pattern);
      if (match) {
        return { value: match[1].trim(), confidence: 0.7 };
      }
    }

    return { value: '', confidence: 0 };
  }

  /**
   * Extraer matrícula del médico
   */
  private extractDoctorLicense(text: string): { value: string; confidence: number } {
    const licensePatterns = [
      /matr[íi]cula[\s:]+([A-Z0-9\s\-]+)/i,
      /M\.?P\.?[\s:]*(\d+)/i,
      /M\.?N\.?[\s:]*(\d+)/i,
    ];

    for (const pattern of licensePatterns) {
      const match = text.match(pattern);
      if (match) {
        return { value: match[1].trim(), confidence: 0.7 };
      }
    }

    return { value: '', confidence: 0 };
  }

  /**
   * Extraer obra social
   */
  private extractHealthInsurance(text: string): { value: string; confidence: number } {
    const insurancePatterns = [
      /obra\s+social[\s:]+([A-Z0-9\s]+)/i,
      /prepaga[\s:]+([A-Z0-9\s]+)/i,
      /(?:OSDE|SWISS MEDICAL|MEDICUS|OMINT|GALENO|IOMA|PAMI)/i,
    ];

    for (const pattern of insurancePatterns) {
      const match = text.match(pattern);
      if (match) {
        return { value: match[0].trim(), confidence: 0.6 };
      }
    }

    return { value: '', confidence: 0 };
  }

  /**
   * Extraer estudios solicitados
   */
  private extractStudies(
    text: string,
    lines: string[]
  ): { value: string[]; confidence: number } {
    const studyKeywords = [
      'resonancia',
      'tomografía',
      'radiografía',
      'ecografía',
      'análisis',
      'laboratorio',
      'electrocardiograma',
      'ecocardiograma',
      'mamografía',
      'densitometría',
      'endoscopia',
      'colonoscopia',
    ];

    const studies: string[] = [];
    const textLower = text.toLowerCase();

    // Buscar keywords
    for (const keyword of studyKeywords) {
      if (textLower.includes(keyword)) {
        // Encontrar la línea completa que contiene el keyword
        const matchingLines = lines.filter((line) =>
          line.toLowerCase().includes(keyword)
        );
        studies.push(...matchingLines);
      }
    }

    // Remover duplicados
    const uniqueStudies = [...new Set(studies)];

    return {
      value: uniqueStudies,
      confidence: uniqueStudies.length > 0 ? 0.6 : 0,
    };
  }

  /**
   * Procesar archivo completo CON IA (Método mejorado)
   */
  async processFile(filePath: string, mimeType: string): Promise<ExtractedMedicalData> {
    this.logger.log(`Procesando archivo con OCR + IA: ${filePath}`);

    // Paso 1: Extraer texto con OCR
    const ocrResult = await this.extractText(filePath, mimeType);

    this.logger.debug(
      `Texto extraído (confianza: ${(ocrResult.confidence * 100).toFixed(1)}%)`
    );
    this.logger.debug(`Primeras 300 caracteres: ${ocrResult.text.substring(0, 300)}`);

    // Paso 2: Usar regex como fallback
    const regexExtractedData = this.analyzeMedicalData(ocrResult.text);

    // Paso 3: Usar IA para mejorar extracción (solo si hay texto suficiente)
    // Sistema de fallback inteligente: Ollama → Gemini → OCR puro
    let finalData = regexExtractedData;
    let aiUsed = 'ninguna';

    if (ocrResult.text.length > 50) {
      // Intentar primero con Ollama (local, rápido, gratis)
      try {
        this.logger.log('🤖 Intentando analizar con Ollama (IA Local)...');
        const aiData = await this.ollamaService.analyzeMedicalOrder(ocrResult.text);
        aiUsed = 'Ollama';

        // Combinar resultados: usar IA si tiene confianza, sino usar regex
        finalData = {
          patientDNI: {
            value: aiData.patientDNI || regexExtractedData.patientDNI.value,
            confidence: aiData.patientDNI
              ? 0.9
              : regexExtractedData.patientDNI.confidence,
          },
          patientName: {
            value: aiData.patientName || regexExtractedData.patientName.value,
            confidence: aiData.patientName
              ? 0.9
              : regexExtractedData.patientName.confidence,
          },
          orderDate: {
            value: aiData.orderDate || regexExtractedData.orderDate.value,
            confidence: aiData.orderDate ? 0.9 : regexExtractedData.orderDate.confidence,
          },
          doctorName: {
            value: aiData.doctorName || regexExtractedData.doctorName.value,
            confidence: aiData.doctorName
              ? 0.9
              : regexExtractedData.doctorName.confidence,
          },
          doctorLicense: {
            value: aiData.doctorLicense || regexExtractedData.doctorLicense.value,
            confidence: aiData.doctorLicense
              ? 0.9
              : regexExtractedData.doctorLicense.confidence,
          },
          healthInsurance: {
            value: aiData.healthInsurance || regexExtractedData.healthInsurance.value,
            confidence: aiData.healthInsurance
              ? 0.85
              : regexExtractedData.healthInsurance.confidence,
          },
          requestedStudies: {
            value:
              aiData.requestedStudies?.length > 0
                ? aiData.requestedStudies
                : regexExtractedData.requestedStudies.value,
            confidence:
              aiData.requestedStudies?.length > 0
                ? 0.85
                : regexExtractedData.requestedStudies.confidence,
          },
        };

        this.logger.log('✅ Análisis con Ollama completado');
      } catch (ollamaError) {
        // Si Ollama falla, intentar con Gemini (nube)
        this.logger.warn(`⚠️ Ollama no disponible: ${ollamaError.message}`);

        try {
          this.logger.log('🤖 Intentando analizar con Gemini (IA Nube)...');
          const aiData = await this.geminiService.analyzeMedicalOrder(ocrResult.text);
          aiUsed = 'Gemini';

          // Debug: ver qué devuelve Gemini
          this.logger.debug(`📊 Respuesta de Gemini: ${JSON.stringify(aiData, null, 2)}`);

          // Combinar resultados con Gemini (validar que no sean strings vacíos)
          finalData = {
            patientDNI: {
              value:
                (aiData.patientDNI && aiData.patientDNI.trim()) ||
                regexExtractedData.patientDNI.value,
              confidence:
                aiData.patientDNI && aiData.patientDNI.trim()
                  ? 0.9
                  : regexExtractedData.patientDNI.confidence,
            },
            patientName: {
              value:
                (aiData.patientName && aiData.patientName.trim()) ||
                regexExtractedData.patientName.value,
              confidence:
                aiData.patientName && aiData.patientName.trim()
                  ? 0.9
                  : regexExtractedData.patientName.confidence,
            },
            orderDate: {
              value:
                (aiData.orderDate && aiData.orderDate.trim()) ||
                regexExtractedData.orderDate.value,
              confidence:
                aiData.orderDate && aiData.orderDate.trim()
                  ? 0.9
                  : regexExtractedData.orderDate.confidence,
            },
            doctorName: {
              value:
                (aiData.doctorName && aiData.doctorName.trim()) ||
                regexExtractedData.doctorName.value,
              confidence:
                aiData.doctorName && aiData.doctorName.trim()
                  ? 0.9
                  : regexExtractedData.doctorName.confidence,
            },
            doctorLicense: {
              value:
                (aiData.doctorLicense && aiData.doctorLicense.trim()) ||
                regexExtractedData.doctorLicense.value,
              confidence:
                aiData.doctorLicense && aiData.doctorLicense.trim()
                  ? 0.9
                  : regexExtractedData.doctorLicense.confidence,
            },
            healthInsurance: {
              value:
                (aiData.healthInsurance && aiData.healthInsurance.trim()) ||
                regexExtractedData.healthInsurance.value,
              confidence:
                aiData.healthInsurance && aiData.healthInsurance.trim()
                  ? 0.85
                  : regexExtractedData.healthInsurance.confidence,
            },
            requestedStudies: {
              value:
                aiData.requestedStudies?.length > 0
                  ? aiData.requestedStudies
                  : regexExtractedData.requestedStudies.value,
              confidence:
                aiData.requestedStudies?.length > 0
                  ? 0.85
                  : regexExtractedData.requestedStudies.confidence,
            },
          };

          this.logger.log('✅ Análisis con Gemini completado');
        } catch (geminiError) {
          // Ambas IAs fallaron, usar solo OCR + regex
          this.logger.warn(`⚠️ Gemini también falló: ${geminiError.message}`);
          this.logger.warn('📝 Usando solo OCR + Regex para extracción');
          finalData = regexExtractedData;
        }
      }
    }

    this.logger.log(`📋 Datos finales extraídos (IA usada: ${aiUsed}):`);
    this.logger.log(
      `- DNI: ${finalData.patientDNI.value} (${(finalData.patientDNI.confidence * 100).toFixed(0)}%)`
    );
    this.logger.log(
      `- Nombre: ${finalData.patientName.value} (${(finalData.patientName.confidence * 100).toFixed(0)}%)`
    );
    this.logger.log(
      `- Fecha: ${finalData.orderDate.value} (${(finalData.orderDate.confidence * 100).toFixed(0)}%)`
    );
    this.logger.log(
      `- Médico: ${finalData.doctorName.value} (${(finalData.doctorName.confidence * 100).toFixed(0)}%)`
    );
    this.logger.log(
      `- Matrícula: ${finalData.doctorLicense.value} (${(finalData.doctorLicense.confidence * 100).toFixed(0)}%)`
    );
    this.logger.log(
      `- Obra Social: ${finalData.healthInsurance.value} (${(finalData.healthInsurance.confidence * 100).toFixed(0)}%)`
    );
    this.logger.log(
      `- Estudios: ${finalData.requestedStudies.value.length} encontrado(s) (${(finalData.requestedStudies.confidence * 100).toFixed(0)}%)`
    );

    return finalData;
  }
}
