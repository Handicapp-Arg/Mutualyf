import { useState, useEffect } from 'react';
import { Save, RotateCcw, Bot, Sliders, AlignLeft, Phone, Palette, Stethoscope, FileText, Eye, ChevronUp } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { PortalLayout } from '@/components/portal/portal-layout';

interface AiConfigFields {
  botName: string;
  orgName: string;
  contactPhone: string;
  tone: string;
  specialtyMapping: string;
  customRules: string;
  temperature: number;
  maxTokens: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

type FormState = Omit<AiConfigFields, 'updatedAt' | 'updatedBy'>;

const EMPTY_FORM: FormState = {
  botName: '',
  orgName: '',
  contactPhone: '',
  tone: '',
  specialtyMapping: '',
  customRules: '',
  temperature: 0.7,
  maxTokens: 800,
};

function formFromConfig(c: AiConfigFields): FormState {
  return {
    botName: c.botName,
    orgName: c.orgName,
    contactPhone: c.contactPhone,
    tone: c.tone,
    specialtyMapping: c.specialtyMapping,
    customRules: c.customRules,
    temperature: c.temperature,
    maxTokens: c.maxTokens,
  };
}

function hasChanges(config: AiConfigFields | null, form: FormState): boolean {
  if (!config) return false;
  return (Object.keys(EMPTY_FORM) as (keyof FormState)[]).some(
    (k) => form[k] !== (config as any)[k],
  );
}

export function AiConfig() {
  const [config, setConfig] = useState<AiConfigFields | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [previewPrompt, setPreviewPrompt] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/ai-config');
      setConfig(res.data);
      setForm(formFromConfig(res.data));
    } catch {
      setError('Error al cargar la configuración');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaved(false);
    setError('');
    try {
      const res = await apiClient.put('/ai-config', form);
      setConfig(res.data);
      setForm(formFromConfig(res.data));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (config) setForm(formFromConfig(config));
  };

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'range' ? parseFloat(e.target.value) : e.target.value }));

  const togglePreview = async () => {
    if (previewOpen) { setPreviewOpen(false); return; }
    setPreviewLoading(true);
    try {
      const res = await apiClient.get('/ai-config/preview-prompt');
      setPreviewPrompt(res.data.prompt);
      setPreviewOpen(true);
    } catch {
      setPreviewPrompt('Error al cargar el preview.');
      setPreviewOpen(true);
    } finally {
      setPreviewLoading(false);
    }
  };

  const dirty = hasChanges(config, form);

  return (
    <PortalLayout>
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <h1 className="text-lg font-bold text-slate-800">Configuración del Bot</h1>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600">
              Guardado correctamente
            </span>
          )}
          {error && config && (
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">{error}</span>
          )}
          {dirty && (
            <button type="button" onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50">
              <RotateCcw size={13} />
              Descartar
            </button>
          )}
          <button type="button" onClick={togglePreview} disabled={previewLoading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
            <Eye size={13} />
            {previewLoading ? 'Cargando...' : 'Ver prompt final'}
          </button>
          <button
            form="ai-config-form"
            type="submit"
            disabled={isSaving || !dirty}
            className="flex items-center gap-1.5 rounded-lg bg-corporate px-4 py-1.5 text-sm font-bold text-white transition-colors hover:bg-corporate/90 disabled:opacity-40">
            <Save size={13} />
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <div className="px-6 py-6">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-corporate" />
          </div>
        ) : error && !config ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">{error}</div>
        ) : (
          <form id="ai-config-form" onSubmit={handleSave} className="space-y-5">

            {dirty && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700">
                Tenés cambios sin guardar
              </div>
            )}

            {/* Identidad */}
            <Section icon={<Bot size={16} className="text-corporate" />} title="Identidad del bot">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Nombre del bot">
                  <input
                    value={form.botName}
                    onChange={set('botName')}
                    placeholder="MutuaBot"
                    className={inputCls}
                  />
                </Field>
                <Field label="Teléfono de contacto">
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.contactPhone}
                      onChange={set('contactPhone')}
                      placeholder="0800 777 4413"
                      className={inputCls + ' pl-8'}
                    />
                  </div>
                </Field>
              </div>
              <Field label="Nombre de la organización">
                <input
                  value={form.orgName}
                  onChange={set('orgName')}
                  placeholder="MutuaLyF (Mutual Provincial de Luz y Fuerza de Santa Fe)"
                  className={inputCls}
                />
              </Field>
            </Section>

            {/* Tono */}
            <Section icon={<Palette size={16} className="text-corporate" />} title="Tono y estilo">
              <Field label="Cómo debe hablar el bot" hint="Describí el estilo de respuesta en una o dos oraciones.">
                <textarea
                  value={form.tone}
                  onChange={set('tone')}
                  rows={3}
                  placeholder="Español rioplatense, cálido, natural. Respuestas cortas (2-4 oraciones). Sin muletillas robóticas."
                  className={textareaCls}
                />
              </Field>
            </Section>

            {/* Mapeo de síntomas */}
            <Section icon={<Stethoscope size={16} className="text-corporate" />} title="Mapeo de síntomas a especialidades">
              <Field label="Una especialidad por línea" hint='Formato: "- síntoma → ESPECIALIDAD"'>
                <textarea
                  value={form.specialtyMapping}
                  onChange={set('specialtyMapping')}
                  rows={10}
                  placeholder={"- Dolor de pecho, palpitaciones → CARDIOLOGÍA\n- Ansiedad, depresión → PSICOLOGÍA\n- Fiebre, malestar general → CLÍNICA MÉDICA"}
                  className={textareaCls + ' font-mono text-xs'}
                />
              </Field>
            </Section>

            {/* Reglas adicionales */}
            <Section icon={<FileText size={16} className="text-corporate" />} title="Reglas adicionales">
              <Field label="Reglas de negocio específicas (opcional)" hint="Por ejemplo: qué no puede hacer el bot, instrucciones de derivación, etc.">
                <textarea
                  value={form.customRules}
                  onChange={set('customRules')}
                  rows={4}
                  placeholder={"- No agendás turnos directamente — indicá la vía concreta (app MiMutuaLyF).\n- Las recetas son exclusivamente digitales."}
                  className={textareaCls}
                />
              </Field>
            </Section>

            {/* Parámetros técnicos */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Section icon={<Sliders size={16} className="text-corporate" />} title="Creatividad">
                <div className="mb-4 flex items-center gap-3">
                  <input
                    type="range" min="0" max="2" step="0.1"
                    value={form.temperature}
                    onChange={set('temperature')}
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-corporate"
                  />
                  <span className="w-11 shrink-0 rounded-lg border border-slate-200 bg-slate-50 py-1 text-center text-sm font-bold text-slate-700">
                    {form.temperature.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Exacto</span><span>Equilibrado</span><span>Creativo</span>
                </div>
              </Section>

              <Section icon={<AlignLeft size={16} className="text-corporate" />} title="Extensión de respuestas">
                <div className="mb-4 flex items-center gap-3">
                  <input
                    type="range" min="100" max="4096" step="50"
                    value={form.maxTokens}
                    onChange={(e) => setForm((f) => ({ ...f, maxTokens: parseInt(e.target.value) }))}
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-corporate"
                  />
                  <span className="w-14 shrink-0 rounded-lg border border-slate-200 bg-slate-50 py-1 text-center text-sm font-bold text-slate-700">
                    {form.maxTokens}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Corta</span><span>Media</span><span>Larga</span>
                </div>
              </Section>
            </div>

            {/* Preview del prompt final */}
            {previewOpen && previewPrompt && (
              <div className="rounded-xl border border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200">
                      <Eye size={16} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Prompt final que recibe el LLM</p>
                      <p className="text-xs text-slate-400">{previewPrompt.length} caracteres — sin los chunks RAG (esos se agregan en cada consulta)</p>
                    </div>
                  </div>
                  <ChevronUp size={16} className="text-slate-400" />
                </button>
                <div className="border-t px-6 pb-6 pt-4">
                  <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-4 font-mono text-xs leading-relaxed text-slate-600">
                    {previewPrompt}
                  </pre>
                </div>
              </div>
            )}

            {config?.updatedAt && (
              <p className="text-right text-xs text-slate-400">
                Última modificación: {new Date(config.updatedAt).toLocaleString('es-AR')}
                {config.updatedBy ? ` por ${config.updatedBy}` : ''}
              </p>
            )}
          </form>
        )}
      </div>
    </PortalLayout>
  );
}

/* ── Helpers de UI ── */

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-corporate focus:bg-white focus:outline-none focus:ring-1 focus:ring-corporate/20';

const textareaCls =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-700 focus:border-corporate focus:bg-white focus:outline-none focus:ring-1 focus:ring-corporate/20 resize-none';

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white">
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-corporate/10">{icon}</div>
        <p className="text-sm font-bold text-slate-800">{title}</p>
      </div>
      <div className="space-y-4 p-6">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-600">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
