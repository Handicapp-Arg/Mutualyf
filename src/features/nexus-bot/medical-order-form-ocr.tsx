import { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Calendar,
  Heart,
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface MedicalOrderFormOCRProps {
  file: File;
  sessionId: string;
  analyzedData: any; // Datos del OCR
  onSubmit: (data: MedicalOrderData) => Promise<void>;
  onCancel: () => void;
}

export interface MedicalOrderData {
  sessionId: string;
  patientDNI: string;
  patientName: string;
  patientPhone: string;
  orderDate: string;
  doctorName: string;
  doctorLicense: string;
  healthInsurance: string;
  requestedStudies: string[];
}

export function MedicalOrderFormOCR({
  file,
  sessionId,
  analyzedData,
  onSubmit,
  onCancel,
}: MedicalOrderFormOCRProps) {
  const [formData, setFormData] = useState({
    patientDNI: '',
    patientName: '',
    patientPhone: '',
    orderDate: '',
    doctorName: '',
    doctorLicense: '',
    healthInsurance: '',
    requestedStudies: '',
  });

  const [fieldStatus, setFieldStatus] = useState<
    Record<string, { isValid: boolean; confidence: number }>
  >({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar datos detectados por OCR
  useEffect(() => {
    if (analyzedData?.fields) {
      const fields = analyzedData.fields;

      setFormData({
        patientDNI: fields.patientDNI?.value || '',
        patientName: fields.patientName?.value || '',
        patientPhone: '', // Esto no viene del OCR
        orderDate: fields.orderDate?.value || new Date().toISOString().split('T')[0],
        doctorName: fields.doctorName?.value || '',
        doctorLicense: fields.doctorLicense?.value || '',
        healthInsurance: fields.healthInsurance?.value || '',
        requestedStudies: fields.requestedStudies?.value?.join(', ') || '',
      });

      setFieldStatus({
        patientDNI: {
          isValid: fields.patientDNI?.isValid || false,
          confidence: fields.patientDNI?.confidence || 0,
        },
        patientName: {
          isValid: fields.patientName?.isValid || false,
          confidence: fields.patientName?.confidence || 0,
        },
        orderDate: {
          isValid: fields.orderDate?.isValid || false,
          confidence: fields.orderDate?.confidence || 0,
        },
        doctorName: {
          isValid: fields.doctorName?.isValid || false,
          confidence: fields.doctorName?.confidence || 0,
        },
        doctorLicense: {
          isValid: fields.doctorLicense?.isValid || false,
          confidence: fields.doctorLicense?.confidence || 0,
        },
        healthInsurance: {
          isValid: fields.healthInsurance?.isValid || false,
          confidence: fields.healthInsurance?.confidence || 0,
        },
        requestedStudies: {
          isValid: fields.requestedStudies?.isValid || false,
          confidence: fields.requestedStudies?.confidence || 0,
        },
      });
    }
  }, [analyzedData]);

  const getFieldIcon = (fieldName: string) => {
    const status = fieldStatus[fieldName];
    if (!status) return null;

    if (status.isValid && status.confidence >= 0.7) {
      return <CheckCircle2 className="text-green-600" size={16} />;
    } else if (status.confidence > 0.3) {
      return <AlertTriangle className="text-yellow-600" size={16} />;
    }
    return <AlertTriangle className="text-red-600" size={16} />;
  };

  const getFieldClass = (fieldName: string) => {
    const status = fieldStatus[fieldName];
    if (!status) return 'border-slate-300';

    if (status.isValid && status.confidence >= 0.7) {
      return 'border-green-300 bg-green-50';
    } else if (status.confidence > 0.3) {
      return 'border-yellow-300 bg-yellow-50';
    }
    return 'border-red-300 bg-red-50';
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.patientDNI || !/^\d{7,8}$/.test(formData.patientDNI)) {
      newErrors.patientDNI = 'DNI inválido (7-8 dígitos)';
    }

    if (!formData.patientName || formData.patientName.length < 3) {
      newErrors.patientName = 'Nombre completo requerido';
    }

    if (!formData.patientPhone || formData.patientPhone.length < 10) {
      newErrors.patientPhone = 'Teléfono inválido (mínimo 10 dígitos)';
    }

    if (!formData.orderDate) {
      newErrors.orderDate = 'Fecha de orden requerida';
    }

    if (!formData.doctorName || formData.doctorName.length < 3) {
      newErrors.doctorName = 'Nombre del médico requerido';
    }

    if (!formData.requestedStudies || formData.requestedStudies.trim().length === 0) {
      newErrors.requestedStudies = 'Debe especificar al menos un estudio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const studies = formData.requestedStudies
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      await onSubmit({
        sessionId,
        patientDNI: formData.patientDNI,
        patientName: formData.patientName,
        patientPhone: formData.patientPhone,
        orderDate: formData.orderDate,
        doctorName: formData.doctorName,
        doctorLicense: formData.doctorLicense,
        healthInsurance: formData.healthInsurance,
        requestedStudies: studies,
      });
    } catch (error) {
      console.error('Error al enviar orden:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-gradient-to-r from-corporate to-corporate/90 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/20 p-2">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Orden Médica Detectada</h2>
              <p className="text-sm text-white/80">
                {analyzedData?.detectionRate || 0}% de campos detectados automáticamente
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Info del análisis */}
        <div className="border-b bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <FileText className="text-corporate" size={20} />
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">
                Archivo analizado: {file.name}
              </p>
              <p className="text-xs text-slate-600">
                Verifica y corrige los campos marcados en{' '}
                <span className="inline-flex items-center gap-1 font-bold text-yellow-700">
                  <AlertTriangle size={12} />
                  amarillo
                </span>{' '}
                o{' '}
                <span className="inline-flex items-center gap-1 font-bold text-red-700">
                  <AlertTriangle size={12} />
                  rojo
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* DNI */}
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
              DNI del Paciente *{getFieldIcon('patientDNI')}
              {fieldStatus.patientDNI && (
                <span className="text-xs font-normal text-slate-500">
                  {Math.round(fieldStatus.patientDNI.confidence * 100)}% confianza
                </span>
              )}
            </label>
            <input
              type="text"
              value={formData.patientDNI}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  patientDNI: e.target.value.replace(/\D/g, ''),
                })
              }
              placeholder="12345678"
              className={`w-full rounded-lg border px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 ${getFieldClass('patientDNI')} ${
                errors.patientDNI
                  ? 'border-red-300 bg-red-50 focus:ring-red-500'
                  : 'focus:border-corporate focus:ring-corporate'
              }`}
            />
            {errors.patientDNI && (
              <p className="mt-1 text-xs text-red-600">{errors.patientDNI}</p>
            )}
          </div>

          {/* Nombre */}
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
              Nombre Completo *{getFieldIcon('patientName')}
              {fieldStatus.patientName && (
                <span className="text-xs font-normal text-slate-500">
                  {Math.round(fieldStatus.patientName.confidence * 100)}% confianza
                </span>
              )}
            </label>
            <input
              type="text"
              value={formData.patientName}
              onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
              placeholder="Juan Pérez"
              className={`w-full rounded-lg border px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 ${getFieldClass('patientName')} ${
                errors.patientName
                  ? 'border-red-300 bg-red-50 focus:ring-red-500'
                  : 'focus:border-corporate focus:ring-corporate'
              }`}
            />
            {errors.patientName && (
              <p className="mt-1 text-xs text-red-600">{errors.patientName}</p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Teléfono de Contacto *
            </label>
            <input
              type="tel"
              value={formData.patientPhone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  patientPhone: e.target.value.replace(/\D/g, ''),
                })
              }
              placeholder="1123456789"
              className={`w-full rounded-lg border px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 ${
                errors.patientPhone
                  ? 'border-red-300 bg-red-50 focus:ring-red-500'
                  : 'border-slate-300 focus:border-corporate focus:ring-corporate'
              }`}
            />
            {errors.patientPhone && (
              <p className="mt-1 text-xs text-red-600">{errors.patientPhone}</p>
            )}
          </div>

          {/* Fecha */}
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
              Fecha de la Orden *{getFieldIcon('orderDate')}
              {fieldStatus.orderDate && (
                <span className="text-xs font-normal text-slate-500">
                  {Math.round(fieldStatus.orderDate.confidence * 100)}% confianza
                </span>
              )}
            </label>
            <div className="relative">
              <Calendar
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="date"
                value={formData.orderDate}
                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
                className={`w-full rounded-lg border px-4 py-3 pl-10 text-sm transition-colors focus:outline-none focus:ring-2 ${getFieldClass('orderDate')} ${
                  errors.orderDate
                    ? 'border-red-300 bg-red-50 focus:ring-red-500'
                    : 'focus:border-corporate focus:ring-corporate'
                }`}
              />
            </div>
            {errors.orderDate && (
              <p className="mt-1 text-xs text-red-600">{errors.orderDate}</p>
            )}
          </div>

          {/* Médico */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                Médico Solicitante *{getFieldIcon('doctorName')}
              </label>
              <input
                type="text"
                value={formData.doctorName}
                onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                placeholder="Dr. Juan Pérez"
                className={`w-full rounded-lg border px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 ${getFieldClass('doctorName')} ${
                  errors.doctorName
                    ? 'border-red-300 bg-red-50 focus:ring-red-500'
                    : 'focus:border-corporate focus:ring-corporate'
                }`}
              />
              {errors.doctorName && (
                <p className="mt-1 text-xs text-red-600">{errors.doctorName}</p>
              )}
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
                Matrícula {getFieldIcon('doctorLicense')}
              </label>
              <input
                type="text"
                value={formData.doctorLicense}
                onChange={(e) =>
                  setFormData({ ...formData, doctorLicense: e.target.value })
                }
                placeholder="MP 12345"
                className={`w-full rounded-lg border px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 ${getFieldClass('doctorLicense')} focus:border-corporate focus:ring-corporate`}
              />
            </div>
          </div>

          {/* Obra social */}
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
              Obra Social / Prepaga {getFieldIcon('healthInsurance')}
            </label>
            <div className="relative">
              <Heart
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                value={formData.healthInsurance}
                onChange={(e) =>
                  setFormData({ ...formData, healthInsurance: e.target.value })
                }
                placeholder="OSDE, Swiss Medical, etc."
                className={`w-full rounded-lg border px-4 py-3 pl-10 text-sm transition-colors focus:outline-none focus:ring-2 ${getFieldClass('healthInsurance')} focus:border-corporate focus:ring-corporate`}
              />
            </div>
          </div>

          {/* Estudios */}
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700">
              Estudios Solicitados *{getFieldIcon('requestedStudies')}
              {fieldStatus.requestedStudies && (
                <span className="text-xs font-normal text-slate-500">
                  {Math.round(fieldStatus.requestedStudies.confidence * 100)}% confianza
                </span>
              )}
            </label>
            <div className="relative">
              <Stethoscope className="absolute left-3 top-3 text-slate-400" size={18} />
              <textarea
                value={formData.requestedStudies}
                onChange={(e) =>
                  setFormData({ ...formData, requestedStudies: e.target.value })
                }
                placeholder="Ej: Resonancia magnética lumbar, Radiografía de tórax"
                rows={3}
                className={`w-full rounded-lg border px-4 py-3 pl-10 text-sm transition-colors focus:outline-none focus:ring-2 ${getFieldClass('requestedStudies')} ${
                  errors.requestedStudies
                    ? 'border-red-300 bg-red-50 focus:ring-red-500'
                    : 'focus:border-corporate focus:ring-corporate'
                }`}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Separar múltiples estudios con comas
            </p>
            {errors.requestedStudies && (
              <p className="mt-1 text-xs text-red-600">{errors.requestedStudies}</p>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-3 border-t pt-6">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border-2 border-slate-300 px-4 py-3 font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-corporate px-4 py-3 font-bold text-white shadow-lg transition-all hover:bg-corporate/90 hover:shadow-xl disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  Procesando...
                </span>
              ) : (
                'Confirmar y Enviar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
