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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4">
      <div className="flex h-full w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl sm:h-auto sm:max-h-[95vh]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b bg-gradient-to-r from-corporate to-corporate/90 p-3 sm:p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-black text-white sm:text-xl">
              Orden Médica Detectada
            </h2>
            <p className="text-xs text-white/80 sm:text-sm">
              {analyzedData?.detectionRate || 0}% detectado automáticamente
            </p>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white sm:p-2"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info del análisis */}
        <div className="shrink-0 border-b bg-blue-50/50 p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <FileText className="text-corporate" size={18} />
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-800 sm:text-sm">
                Archivo: {file.name}
              </p>
              <p className="text-xs text-slate-600">
                Verifica y corrige los campos detectados antes de confirmar
              </p>
            </div>
          </div>
        </div>

        {/* Formulario con scroll */}
        <div className="flex-1 overflow-y-auto">
          <form
            id="medical-order-form"
            onSubmit={handleSubmit}
            className="space-y-4 p-3 sm:space-y-5 sm:p-4"
          >
            {/* DNI */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span>DNI del Paciente</span>
                <span className="text-rose-600">*</span>
                {getFieldIcon('patientDNI')}
                {fieldStatus.patientDNI && (
                  <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {Math.round(fieldStatus.patientDNI.confidence * 100)}%
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
                className={`w-full rounded-lg border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 ${getFieldClass('patientDNI')} ${
                  errors.patientDNI
                    ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-500'
                    : 'focus:border-corporate focus:ring-corporate/20'
                }`}
              />
              {errors.patientDNI && (
                <p className="mt-1 text-xs text-rose-600">{errors.patientDNI}</p>
              )}
            </div>

            {/* Nombre */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span>Nombre Completo</span>
                <span className="text-rose-600">*</span>
                {getFieldIcon('patientName')}
                {fieldStatus.patientName && (
                  <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {Math.round(fieldStatus.patientName.confidence * 100)}%
                  </span>
                )}
              </label>
              <input
                type="text"
                value={formData.patientName}
                onChange={(e) =>
                  setFormData({ ...formData, patientName: e.target.value })
                }
                placeholder="Juan Pérez"
                className={`w-full rounded-lg border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 ${getFieldClass('patientName')} ${
                  errors.patientName
                    ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-500'
                    : 'focus:border-corporate focus:ring-corporate/20'
                }`}
              />
              {errors.patientName && (
                <p className="mt-1 text-xs text-rose-600">{errors.patientName}</p>
              )}
            </div>

            {/* Teléfono */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span>Teléfono de Contacto</span>
                <span className="text-rose-600">*</span>
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
                className={`w-full rounded-lg border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 ${
                  errors.patientPhone
                    ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-500'
                    : 'border-slate-200 bg-white focus:border-corporate focus:ring-corporate/20'
                }`}
              />
              {errors.patientPhone && (
                <p className="mt-1 text-xs text-rose-600">{errors.patientPhone}</p>
              )}
            </div>

            {/* Fecha */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span>Fecha de la Orden</span>
                <span className="text-rose-600">*</span>
                {getFieldIcon('orderDate')}
                {fieldStatus.orderDate && (
                  <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {Math.round(fieldStatus.orderDate.confidence * 100)}%
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
                  onChange={(e) =>
                    setFormData({ ...formData, orderDate: e.target.value })
                  }
                  max={new Date().toISOString().split('T')[0]}
                  className={`w-full rounded-lg border px-4 py-3 pl-10 text-sm transition-all focus:outline-none focus:ring-2 ${getFieldClass('orderDate')} ${
                    errors.orderDate
                      ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-500'
                      : 'focus:border-corporate focus:ring-corporate/20'
                  }`}
                />
              </div>
              {errors.orderDate && (
                <p className="mt-1 text-xs text-rose-600">{errors.orderDate}</p>
              )}
            </div>

            {/* Médico */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span>Médico Solicitante</span>
                  <span className="text-rose-600">*</span>
                  {getFieldIcon('doctorName')}
                  {fieldStatus.doctorName && (
                    <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {Math.round(fieldStatus.doctorName.confidence * 100)}%
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.doctorName}
                  onChange={(e) =>
                    setFormData({ ...formData, doctorName: e.target.value })
                  }
                  placeholder="Dr. Juan Pérez"
                  className={`w-full rounded-lg border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 ${getFieldClass('doctorName')} ${
                    errors.doctorName
                      ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-500'
                      : 'focus:border-corporate focus:ring-corporate/20'
                  }`}
                />
                {errors.doctorName && (
                  <p className="mt-1 text-xs text-rose-600">{errors.doctorName}</p>
                )}
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span>Matrícula</span>
                  {getFieldIcon('doctorLicense')}
                  {fieldStatus.doctorLicense && (
                    <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {Math.round(fieldStatus.doctorLicense.confidence * 100)}%
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.doctorLicense}
                  onChange={(e) =>
                    setFormData({ ...formData, doctorLicense: e.target.value })
                  }
                  placeholder="MP 12345"
                  className={`w-full rounded-lg border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 ${getFieldClass('doctorLicense')} focus:border-corporate focus:ring-corporate/20`}
                />
              </div>
            </div>

            {/* Obra social */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span>Obra Social / Prepaga</span>
                {getFieldIcon('healthInsurance')}
                {fieldStatus.healthInsurance && (
                  <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {Math.round(fieldStatus.healthInsurance.confidence * 100)}%
                  </span>
                )}
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
                  className={`w-full rounded-lg border px-4 py-3 pl-10 text-sm transition-all focus:outline-none focus:ring-2 ${getFieldClass('healthInsurance')} focus:border-corporate focus:ring-corporate/20`}
                />
              </div>
            </div>

            {/* Estudios */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span>Estudios Solicitados</span>
                <span className="text-rose-600">*</span>
                {getFieldIcon('requestedStudies')}
                {fieldStatus.requestedStudies && (
                  <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {Math.round(fieldStatus.requestedStudies.confidence * 100)}%
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
                  className={`w-full rounded-lg border px-4 py-3 pl-10 text-sm transition-all focus:outline-none focus:ring-2 ${getFieldClass('requestedStudies')} ${
                    errors.requestedStudies
                      ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-500'
                      : 'focus:border-corporate focus:ring-corporate/20'
                  }`}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Separar múltiples estudios con comas
              </p>
              {errors.requestedStudies && (
                <p className="mt-1 text-xs text-rose-600">{errors.requestedStudies}</p>
              )}
            </div>
          </form>
        </div>

        {/* Footer con botones fijos */}
        <div className="shrink-0 border-t bg-slate-50 p-3 sm:p-4">
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border-2 border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 sm:px-4 sm:py-3 sm:text-base"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="medical-order-form"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-corporate px-3 py-2 text-sm font-bold text-white shadow-lg transition-all hover:bg-corporate/90 hover:shadow-xl disabled:opacity-50 sm:px-4 sm:py-3 sm:text-base"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="sm:size-18 animate-spin" />
                  Procesando...
                </span>
              ) : (
                'Confirmar y Enviar'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
