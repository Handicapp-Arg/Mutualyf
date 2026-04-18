import { useState, useEffect } from 'react';
import { Save, RotateCcw, Bot, Sliders, AlignLeft } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { PortalLayout } from '@/components/portal/portal-layout';

interface AiConfigData {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  quickButtons: string;
  updatedAt: string | null;
  updatedBy: string | null;
}

export function AiConfig() {
  const [config, setConfig] = useState<AiConfigData | null>(null);
  const [form, setForm] = useState({ systemPrompt: '', temperature: 0.7, maxTokens: 800 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/ai-config');
      setConfig(res.data);
      setForm({ systemPrompt: res.data.systemPrompt, temperature: res.data.temperature, maxTokens: res.data.maxTokens });
    } catch {
      setError('Error al cargar la configuracion');
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
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (config) setForm({ systemPrompt: config.systemPrompt, temperature: config.temperature, maxTokens: config.maxTokens });
  };

  const hasChanges = config && (
    form.systemPrompt !== config.systemPrompt ||
    form.temperature !== config.temperature ||
    form.maxTokens !== config.maxTokens
  );

  return (
    <PortalLayout>
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <h1 className="text-lg font-bold text-slate-800">Configuracion de IA</h1>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600">
              Guardado correctamente
            </span>
          )}
          {error && config && (
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">{error}</span>
          )}
          {hasChanges && (
            <button type="button" onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50">
              <RotateCcw size={13} />
              Descartar
            </button>
          )}
          <button
            form="ai-config-form"
            type="submit"
            disabled={isSaving || !hasChanges}
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

            {/* Cambios sin guardar */}
            {hasChanges && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700">
                Tenés cambios sin guardar
              </div>
            )}

            {/* Personalidad */}
            <div className="rounded-xl border bg-white">
              <div className="flex items-center gap-3 border-b px-6 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-corporate/10">
                  <Bot size={16} className="text-corporate" />
                </div>
                <p className="text-sm font-bold text-slate-800">Personalidad del asistente</p>
              </div>
              <div className="p-6">
                <textarea
                  value={form.systemPrompt}
                  onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
                  rows={14}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm leading-relaxed text-slate-700 focus:border-corporate focus:bg-white focus:outline-none focus:ring-1 focus:ring-corporate/20"
                  placeholder="Ej: Sos el asistente virtual de MutuaLyF. Respondé siempre en español, con un tono amable y profesional. No inventes información que no tengas disponible..."
                />
                <p className="mt-2 text-right text-xs text-slate-400">{form.systemPrompt.length} caracteres</p>
              </div>
            </div>

            {/* Parámetros */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              {/* Creatividad */}
              <div className="rounded-xl border bg-white">
                <div className="flex items-center gap-3 border-b px-6 py-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-corporate/10">
                    <Sliders size={16} className="text-corporate" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">Creatividad</p>
                </div>
                <div className="p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <input
                      type="range" min="0" max="2" step="0.1"
                      value={form.temperature}
                      onChange={(e) => setForm((f) => ({ ...f, temperature: parseFloat(e.target.value) }))}
                      className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-corporate"
                    />
                    <span className="w-11 shrink-0 rounded-lg border border-slate-200 bg-slate-50 py-1 text-center text-sm font-bold text-slate-700">
                      {form.temperature.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Exacto</span><span>Equilibrado</span><span>Creativo</span>
                  </div>
                </div>
              </div>

              {/* Longitud */}
              <div className="rounded-xl border bg-white">
                <div className="flex items-center gap-3 border-b px-6 py-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-corporate/10">
                    <AlignLeft size={16} className="text-corporate" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">Extensión de respuestas</p>
                </div>
                <div className="p-6">
                  <div className="mb-5 flex items-center gap-3">
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
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </PortalLayout>
  );
}
