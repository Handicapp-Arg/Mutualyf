import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Save, ToggleLeft, ToggleRight, Zap } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { PortalLayout } from '@/components/portal/portal-layout';

interface QuickReply {
  id: number;
  keywords: string[];
  response: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  keywords: string;
  response: string;
  priority: number;
  isActive: boolean;
}

const emptyForm: FormState = { keywords: '', response: '', priority: 0, isActive: true };

export function QuickReplies() {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const loadReplies = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/quick-replies');
      setReplies(res.data);
    } catch {
      setError('Error al cargar respuestas rápidas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReplies();
  }, [loadReplies]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (reply: QuickReply) => {
    setEditingId(reply.id);
    setForm({
      keywords: reply.keywords.join(', '),
      response: reply.response,
      priority: reply.priority,
      isActive: reply.isActive,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    const keywords = form.keywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    if (keywords.length === 0 || !form.response.trim()) {
      setError('Keywords y respuesta son obligatorios');
      setIsSaving(false);
      return;
    }

    try {
      const payload = { keywords, response: form.response, priority: form.priority, isActive: form.isActive };

      if (editingId) {
        await apiClient.put(`/quick-replies/${editingId}`, payload);
      } else {
        await apiClient.post('/quick-replies', payload);
      }

      closeForm();
      await loadReplies();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (reply: QuickReply) => {
    try {
      await apiClient.put(`/quick-replies/${reply.id}`, { isActive: !reply.isActive });
      await loadReplies();
    } catch {
      setError('Error al cambiar estado');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta respuesta rápida?')) return;
    try {
      await apiClient.delete(`/quick-replies/${id}`);
      await loadReplies();
    } catch {
      setError('Error al eliminar');
    }
  };

  return (
    <PortalLayout>
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-corporate/10">
            <Zap size={18} className="text-corporate" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Respuestas Rápidas</h1>
            <p className="text-xs text-slate-400">
              Respuestas instantáneas por keywords. Se evalúan antes de la IA (0ms de latencia).
            </p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-corporate px-4 py-2 text-sm font-bold text-white hover:bg-corporate/90"
        >
          <Plus size={14} />
          Agregar
        </button>
      </div>

      <div className="px-6 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
            <button onClick={() => setError('')} className="ml-2 font-bold">x</button>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="mb-6 rounded-xl border bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700">
                {editingId ? 'Editar respuesta' : 'Nueva respuesta rápida'}
              </h2>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Keywords</label>
                <p className="mb-2 text-xs text-slate-400">Separadas por coma. Si el mensaje contiene alguna, se activa esta respuesta.</p>
                <input
                  type="text"
                  value={form.keywords}
                  onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                  placeholder="horario, hora, abierto, abren"
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-corporate focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Respuesta</label>
                <p className="mb-2 text-xs text-slate-400">Soporta Markdown. Se envía al usuario como streaming simulado.</p>
                <textarea
                  value={form.response}
                  onChange={(e) => setForm((f) => ({ ...f, response: e.target.value }))}
                  rows={8}
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 font-mono text-sm leading-relaxed text-slate-700 focus:border-corporate focus:outline-none"
                  placeholder="**Horario de atención:**&#10;&#10;Lunes a viernes..."
                />
                <div className="mt-1 text-right text-xs text-slate-400">{form.response.length} caracteres</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Prioridad</label>
                  <p className="mb-2 text-xs text-slate-400">Mayor = se evalúa primero.</p>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-corporate focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 accent-corporate"
                    />
                    <span className="font-bold">Activa</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-lg bg-corporate px-4 py-2 text-sm font-bold text-white hover:bg-corporate/90 disabled:opacity-50"
                >
                  <Save size={14} />
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista */}
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-corporate" />
          </div>
        ) : replies.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center text-sm text-slate-400">
            No hay respuestas rápidas configuradas.
          </div>
        ) : (
          <div className="space-y-3">
            {replies.map((reply) => (
              <div
                key={reply.id}
                className={`rounded-xl border bg-white p-4 transition-opacity ${!reply.isActive ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {reply.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-corporate/10 px-2.5 py-0.5 text-xs font-bold text-corporate"
                        >
                          {kw}
                        </span>
                      ))}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-400">
                        P:{reply.priority}
                      </span>
                    </div>
                    <p className="line-clamp-2 whitespace-pre-wrap text-sm text-slate-600">{reply.response}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => handleToggle(reply)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                      title={reply.isActive ? 'Desactivar' : 'Activar'}
                    >
                      {reply.isActive ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} />}
                    </button>
                    <button
                      onClick={() => openEdit(reply)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(reply.id)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
