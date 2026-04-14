import { useState, useEffect } from 'react';
import { Save, RotateCcw, Plus, Trash2, GripVertical } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { PortalLayout } from '@/components/portal/portal-layout';

interface QuickButton {
  icon: string;
  label: string;
  prompt: string;
}

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
  const [buttons, setButtons] = useState<QuickButton[]>([]);
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
      try {
        const parsed = JSON.parse(res.data.quickButtons || '[]');
        setButtons(Array.isArray(parsed) ? parsed : []);
      } catch {
        setButtons([]);
      }
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
      const payload = {
        ...form,
        quickButtons: JSON.stringify(buttons),
      };
      const res = await apiClient.put('/ai-config', payload);
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
      try {
        const parsed = JSON.parse(config.quickButtons || '[]');
        setButtons(Array.isArray(parsed) ? parsed : []);
      } catch {
        setButtons([]);
      }
    }
  };

  const addButton = () => {
    setButtons((prev) => [...prev, { icon: '💬', label: '', prompt: '' }]);
  };

  const removeButton = (index: number) => {
    setButtons((prev) => prev.filter((_, i) => i !== index));
  };

  const updateButton = (index: number, field: keyof QuickButton, value: string) => {
    setButtons((prev) =>
      prev.map((btn, i) => (i === index ? { ...btn, [field]: value } : btn))
    );
  };

  const moveButton = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= buttons.length) return;
    setButtons((prev) => {
      const copy = [...prev];
      const a = copy[index]!;
      const b = copy[newIndex]!;
      copy[index] = b;
      copy[newIndex] = a;
      return copy;
    });
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const originalButtons = (() => {
    try {
      return JSON.parse(config?.quickButtons || '[]');
    } catch {
      return [];
    }
  })();

  const hasChanges = config && (
    form.systemPrompt !== config.systemPrompt ||
    form.temperature !== config.temperature ||
    form.maxTokens !== config.maxTokens ||
    JSON.stringify(buttons) !== JSON.stringify(originalButtons)
  );

  return (
    <PortalLayout>
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Configuracion de IA</h1>
          <p className="text-xs text-slate-400">System prompt, parametros del modelo y botones rapidos. Los cambios aplican inmediatamente.</p>
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

            {/* Quick Buttons */}
            <div className="rounded-xl border bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <label className="block text-sm font-bold text-slate-700">
                    Botones rapidos del chat
                  </label>
                  <p className="mt-1 text-xs text-slate-400">
                    Botones visibles en el chat. Al hacer clic, el prompt se envia a la IA.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addButton}
                  className="flex items-center gap-1.5 rounded-lg bg-corporate px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-corporate/90"
                >
                  <Plus size={14} />
                  Agregar
                </button>
              </div>

              {buttons.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                  No hay botones configurados. Agrega uno para empezar.
                </div>
              ) : (
                <div className="space-y-3">
                  {buttons.map((btn, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4"
                    >
                      {/* Reorder */}
                      <div className="flex flex-col gap-0.5 pt-2">
                        <button
                          type="button"
                          onClick={() => moveButton(idx, -1)}
                          disabled={idx === 0}
                          className="text-slate-400 hover:text-slate-600 disabled:opacity-20"
                          title="Mover arriba"
                        >
                          <GripVertical size={14} />
                        </button>
                      </div>

                      {/* Fields */}
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={btn.icon}
                            onChange={(e) => updateButton(idx, 'icon', e.target.value)}
                            placeholder="Emoji"
                            className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm focus:border-corporate focus:outline-none focus:ring-1 focus:ring-corporate/20"
                            maxLength={4}
                          />
                          <input
                            type="text"
                            value={btn.label}
                            onChange={(e) => updateButton(idx, 'label', e.target.value)}
                            placeholder="Texto del boton (ej: Servicios de salud)"
                            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-corporate focus:outline-none focus:ring-1 focus:ring-corporate/20"
                          />
                        </div>
                        <textarea
                          value={btn.prompt}
                          onChange={(e) => updateButton(idx, 'prompt', e.target.value)}
                          placeholder="Prompt que se envia a la IA cuando el usuario hace clic (ej: Contame sobre los servicios de salud de MutuaLyF)"
                          rows={2}
                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-corporate focus:outline-none focus:ring-1 focus:ring-corporate/20"
                        />
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => removeButton(idx)}
                        className="mt-2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        title="Eliminar boton"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {buttons.length > 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <span>Vista previa:</span>
                  <div className="flex gap-1.5 overflow-x-auto">
                    {buttons.map((btn, idx) => (
                      <span
                        key={idx}
                        className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600"
                      >
                        {btn.icon} {btn.label || '...'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
