import { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
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

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/ai-config');
      setConfig(res.data);
      setForm({
        systemPrompt: res.data.systemPrompt,
        temperature: res.data.temperature,
        maxTokens: res.data.maxTokens,
      });
    } catch (err) {
      console.error('Error cargando config:', err);
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
    if (config) {
      setForm({
        systemPrompt: config.systemPrompt,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });
    }
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
        <div>
          <h1 className="text-lg font-bold text-slate-800">Configuracion de IA</h1>
          <p className="text-xs text-slate-400">System prompt y parametros del modelo. Los cambios aplican inmediatamente.</p>
        </div>
        {config?.updatedBy && (
          <span className="text-xs text-slate-400">
            Editado por {config.updatedBy} el {formatDate(config.updatedAt)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-corporate" />
          </div>
        ) : error && !config ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
            {error}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* System Prompt */}
            <div className="rounded-xl border bg-white p-6">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                System Prompt
              </label>
              <p className="mb-3 text-xs text-slate-400">
                Instrucciones que definen la personalidad y comportamiento del asistente. Se inyecta en cada conversacion.
              </p>
              <textarea
                value={form.systemPrompt}
                onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
                rows={16}
                className="w-full rounded-lg border border-slate-200 px-4 py-3 font-mono text-sm leading-relaxed text-slate-700 focus:border-corporate focus:outline-none focus:ring-1 focus:ring-corporate/20"
                placeholder="Eres un asistente..."
              />
              <div className="mt-2 text-right text-xs text-slate-400">
                {form.systemPrompt.length} caracteres
              </div>
            </div>

            {/* Parameters */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-xl border bg-white p-6">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Temperature
                </label>
                <p className="mb-3 text-xs text-slate-400">
                  Controla la creatividad. 0 = determinista, 2 = muy creativo.
                </p>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={form.temperature}
                    onChange={(e) => setForm((f) => ({ ...f, temperature: parseFloat(e.target.value) }))}
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-corporate"
                  />
                  <span className="w-12 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm font-bold text-slate-700">
                    {form.temperature.toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border bg-white p-6">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Max Tokens
                </label>
                <p className="mb-3 text-xs text-slate-400">
                  Longitud maxima de la respuesta. Mayor = respuestas mas largas.
                </p>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="100"
                    max="4096"
                    step="50"
                    value={form.maxTokens}
                    onChange={(e) => setForm((f) => ({ ...f, maxTokens: parseInt(e.target.value) }))}
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-corporate"
                  />
                  <span className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm font-bold text-slate-700">
                    {form.maxTokens}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div>
                {saved && (
                  <span className="text-sm font-bold text-green-600">
                    Configuracion guardada correctamente
                  </span>
                )}
                {error && config && (
                  <span className="text-sm font-bold text-red-600">{error}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {hasChanges && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <RotateCcw size={14} />
                    Descartar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSaving || !hasChanges}
                  className="flex items-center gap-2 rounded-lg bg-corporate px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-corporate/90 disabled:opacity-50"
                >
                  <Save size={14} />
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </PortalLayout>
  );
}
