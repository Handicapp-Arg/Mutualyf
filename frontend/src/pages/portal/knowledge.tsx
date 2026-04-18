import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen, Upload, RefreshCw, FileText, Loader2,
  Plus, Pencil, Trash2, X, Save, ToggleLeft, ToggleRight, Zap,
  ChevronRight, Hash, Tag, Calendar, Layers, Cpu,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { PortalLayout } from '@/components/portal/portal-layout';
import { RAG_CATEGORIES } from '@/types';
import type { KnowledgeDoc, KnowledgeDocDetail } from '@/types';

// ── Quick Reply types ──

interface QuickReply {
  id: number;
  keywords: string[];
  response: string;
  priority: number;
  isActive: boolean;
}

interface QRForm {
  keywords: string;
  response: string;
  priority: number;
  isActive: boolean;
}

const emptyQRForm: QRForm = { keywords: '', response: '', priority: 0, isActive: true };

type KnowledgeTab = 'documents' | 'quick-replies';

// ══════════════════════════════════════════════
// Componente principal
// ══════════════════════════════════════════════

export function Knowledge() {
  const [tab, setTab] = useState<KnowledgeTab>('documents');

  return (
    <PortalLayout>
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Base de Conocimiento</h1>
        </div>
      </div>

      <div className="p-6">
        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setTab('documents')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold transition-colors ${
              tab === 'documents'
                ? 'bg-white text-corporate shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <BookOpen size={16} />
            Documentos
          </button>
          <button
            onClick={() => setTab('quick-replies')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold transition-colors ${
              tab === 'quick-replies'
                ? 'bg-white text-corporate shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Zap size={16} />
            Respuestas rapidas
          </button>
        </div>

        {tab === 'documents' ? <DocumentsTab /> : <QuickRepliesTab />}
      </div>
    </PortalLayout>
  );
}

// ══════════════════════════════════════════════
// Tab: Documentos (RAG)
// ══════════════════════════════════════════════

function DocumentsTab() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);

  const [mode, setMode] = useState<'text' | 'file'>('file');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [textContent, setTextContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [detailDocId, setDetailDocId] = useState<number | null>(null);

  useEffect(() => { loadDocs(); }, []);

  const loadDocs = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/admin/rag/docs');
      setDocs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error cargando documentos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateText = async () => {
    if (!title.trim() || !textContent.trim()) return;
    setIsUploading(true);
    try {
      await apiClient.post('/admin/rag/docs', {
        title: title.trim(), source: 'manual', category, content: textContent.trim(),
      });
      setTitle(''); setTextContent(''); setCategory('general');
      await loadDocs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al crear documento');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadFile = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      if (title.trim()) formData.append('title', title.trim());
      await apiClient.post('/admin/rag/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFile(null); setTitle(''); setCategory('general');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadDocs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al subir archivo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`¿Eliminar "${title}"? Se borra el documento, sus fragmentos y los vectores. Esta accion no se puede deshacer.`)) return;
    try {
      await apiClient.delete(`/admin/rag/docs/${id}`);
      await loadDocs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar documento');
    }
  };

  const handleRebuild = async () => {
    if (!window.confirm('¿Reconstruir el indice? Puede tardar unos segundos.')) return;
    setIsRebuilding(true);
    try {
      const res = await apiClient.post('/admin/rag/rebuild');
      const rebuilt = res.data?.rebuilt ?? 0;
      alert(`Indice reconstruido: ${rebuilt} fragmentos procesados`);
    } catch (err) {
      console.error('Error reconstruyendo:', err);
    } finally {
      setIsRebuilding(false);
    }
  };

  const getCategoryLabel = (cat: string) =>
    RAG_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;

  const formatTokens = (tokens: number) =>
    tokens > 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens);

  return (
    <>
      {/* Info + acciones */}
      <div className="mb-4 flex items-start justify-between">
        <p className="text-xs text-slate-400">
          Documentos que el bot consulta cuando un usuario hace una pregunta. Podes agregar texto o subir archivos PDF/TXT.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={loadDocs} disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refrescar
          </button>
          <button onClick={handleRebuild} disabled={isRebuilding}
            className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600 hover:bg-orange-100 disabled:opacity-50">
            {isRebuilding ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Re-indexar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Formulario */}
        <div className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 text-base font-black text-slate-800">Agregar contenido</h2>

          <div className="mb-4 flex rounded-lg bg-slate-100 p-1">
            <button onClick={() => setMode('text')}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-bold transition-colors ${mode === 'text' ? 'bg-white text-corporate shadow-sm' : 'text-slate-500'}`}>
              Texto
            </button>
            <button onClick={() => setMode('file')}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-bold transition-colors ${mode === 'file' ? 'bg-white text-corporate shadow-sm' : 'text-slate-500'}`}>
              Archivo
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Titulo</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Horarios de atencion"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-corporate focus:outline-none focus:ring-1 focus:ring-corporate"
                disabled={isUploading} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Categoria</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-corporate focus:outline-none focus:ring-1 focus:ring-corporate"
                disabled={isUploading}>
                {RAG_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {mode === 'text' ? (
              <>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Contenido</label>
                  <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Escribi la informacion que el bot debe saber..."
                    rows={8} disabled={isUploading}
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-corporate focus:outline-none focus:ring-1 focus:ring-corporate" />
                </div>
                <button onClick={handleCreateText}
                  disabled={isUploading || !title.trim() || !textContent.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-corporate px-4 py-2.5 text-sm font-bold text-white hover:bg-corporate/90 disabled:opacity-50">
                  {isUploading ? <><Loader2 size={16} className="animate-spin" /> Procesando...</>
                    : <><BookOpen size={16} /> Agregar documento</>}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Archivo (PDF, TXT, MD)</label>
                  <input type="file" ref={fileInputRef}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
                    accept=".pdf,.txt,.md,.markdown" className="hidden" />
                  <div onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-center hover:border-corporate hover:bg-slate-50">
                    {file ? (
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-corporate" />
                        <span className="text-sm font-medium text-slate-700">{file.name}</span>
                        <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(0)} KB)</span>
                      </div>
                    ) : (
                      <><Upload size={24} className="text-slate-400" /><p className="text-xs text-slate-500">Click para seleccionar</p></>
                    )}
                  </div>
                </div>
                <button onClick={handleUploadFile} disabled={isUploading || !file}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-corporate px-4 py-2.5 text-sm font-bold text-white hover:bg-corporate/90 disabled:opacity-50">
                  {isUploading ? <><Loader2 size={16} className="animate-spin" /> Subiendo...</>
                    : <><Upload size={16} /> Subir archivo</>}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Lista de documentos */}
        <div className="rounded-xl border bg-white p-6 xl:col-span-2">
          <h2 className="mb-4 text-base font-black text-slate-800">
            Documentos indexados
            {!isLoading && (
              <span className="ml-2 text-sm font-medium text-slate-400">
                ({docs.filter((d) => d.status === 'active').length} activos)
              </span>
            )}
          </h2>

          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 size={24} className="animate-spin text-corporate" />
            </div>
          ) : docs.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
              <BookOpen size={32} />
              <p className="text-sm">No hay documentos cargados</p>
              <p className="text-xs">Agrega contenido para que el bot responda mejor</p>
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setDetailDocId(doc.id)}
                  className={`group flex w-full items-start justify-between rounded-lg border p-4 text-left transition-colors hover:border-corporate hover:bg-slate-50 ${
                    doc.status === 'active' ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-bold text-slate-700">{doc.title}</h3>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        doc.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {doc.status === 'active' ? 'Activo' : 'Archivado'}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="rounded bg-corporate/10 px-1.5 py-0.5 font-medium text-corporate">
                        {getCategoryLabel(doc.category)}
                      </span>
                      <span>{doc._count.chunks} fragmentos</span>
                      <span>{formatTokens(doc.tokensTotal)} tokens</span>
                      <span>{formatDate(doc.createdAt)}</span>
                    </div>
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(doc.id, doc.title); }}
                      className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"
                      title="Eliminar documento"
                    >
                      <Trash2 size={12} /> Eliminar
                    </button>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-corporate" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {detailDocId !== null && (
        <DocDetailModal docId={detailDocId} onClose={() => setDetailDocId(null)} />
      )}
    </>
  );
}

// ══════════════════════════════════════════════
// Modal: Detalle de documento (chunks)
// ══════════════════════════════════════════════

function DocDetailModal({ docId, onClose }: { docId: number; onClose: () => void }) {
  const [doc, setDoc] = useState<KnowledgeDocDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');
    apiClient.get(`/admin/rag/docs/${docId}`)
      .then((res) => { if (!cancelled) setDoc(res.data); })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.message || 'Error al cargar'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [docId]);

  const getCategoryLabel = (cat: string) =>
    RAG_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-black text-slate-800">
              {doc?.title || 'Cargando...'}
            </h2>
            {doc && (
              <p className="mt-0.5 truncate text-xs text-slate-500">{doc.source}</p>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 size={24} className="animate-spin text-corporate" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-red-600">{error}</div>
          ) : doc ? (
            <>
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 bg-slate-50 p-5 sm:grid-cols-4">
                <Meta icon={Tag} label="Categoria" value={getCategoryLabel(doc.category)} />
                <Meta icon={Layers} label="Fragmentos" value={String(doc.chunks.length)} />
                <Meta icon={Hash} label="Tokens totales" value={String(doc.tokensTotal)} />
                <Meta icon={Calendar} label="Creado" value={formatDate(doc.createdAt)} />
                <Meta icon={Tag} label="Estado" value={doc.status === 'active' ? 'Activo' : 'Archivado'} />
                <Meta icon={Hash} label="Version" value={`v${doc.version}`} />
                <Meta icon={Cpu} label="Modelo embed" value={doc.chunks[0]?.embModel ?? '-'} />
                <Meta icon={Hash} label="Hash" value={doc.hash.slice(0, 12) + '...'} mono />
              </div>

              {/* Chunks */}
              <div className="p-5">
                <h3 className="mb-3 text-sm font-bold text-slate-700">
                  Fragmentos ({doc.chunks.length})
                </h3>
                {doc.chunks.length === 0 ? (
                  <p className="text-center text-xs text-slate-400">Este documento no tiene fragmentos indexados.</p>
                ) : (
                  <div className="space-y-3">
                    {doc.chunks.map((chunk) => (
                      <div key={chunk.id} className="rounded-lg border border-slate-200 bg-white">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
                          <span className="text-xs font-bold text-slate-600">
                            Fragmento #{chunk.ord + 1}
                          </span>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400">
                            <span>id: {chunk.id}</span>
                            <span>{chunk.tokens} tokens</span>
                          </div>
                        </div>
                        <pre className="whitespace-pre-wrap break-words px-3 py-3 text-xs leading-relaxed text-slate-700">
                          {chunk.content}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Meta({
  icon: Icon, label, value, mono = false,
}: { icon: React.ElementType; label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
        <Icon size={10} />
        {label}
      </div>
      <div className={`mt-0.5 truncate text-xs font-semibold text-slate-700 ${mono ? 'font-mono' : ''}`}>
        {value}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// Tab: Respuestas rapidas
// ══════════════════════════════════════════════

function QuickRepliesTab() {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<QRForm>(emptyQRForm);
  const [isSaving, setIsSaving] = useState(false);

  const loadReplies = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/quick-replies');
      setReplies(res.data);
    } catch {
      setError('Error al cargar');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadReplies(); }, [loadReplies]);

  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(emptyQRForm); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true); setError('');
    const keywords = form.keywords.split(',').map((k) => k.trim()).filter(Boolean);
    if (keywords.length === 0 || !form.response.trim()) {
      setError('Keywords y respuesta son obligatorios'); setIsSaving(false); return;
    }
    try {
      const payload = { keywords, response: form.response, priority: form.priority, isActive: form.isActive };
      if (editingId) { await apiClient.put(`/quick-replies/${editingId}`, payload); }
      else { await apiClient.post('/quick-replies', payload); }
      closeForm(); await loadReplies();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally { setIsSaving(false); }
  };

  const handleToggle = async (reply: QuickReply) => {
    try {
      await apiClient.put(`/quick-replies/${reply.id}`, { isActive: !reply.isActive });
      await loadReplies();
    } catch { setError('Error al cambiar estado'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta respuesta rapida?')) return;
    try { await apiClient.delete(`/quick-replies/${id}`); await loadReplies(); }
    catch { setError('Error al eliminar'); }
  };

  return (
    <>
      <div className="mb-4 flex items-start justify-between">
        <p className="text-xs text-slate-400">
          Respuestas instantaneas por palabras clave. Se activan antes de la IA (sin demora). Ideal para preguntas frecuentes.
        </p>
        <button onClick={() => { setEditingId(null); setForm(emptyQRForm); setShowForm(true); }}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-corporate px-4 py-2 text-sm font-bold text-white hover:bg-corporate/90">
          <Plus size={14} /> Agregar
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-bold">x</button>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="mb-6 rounded-xl border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">
              {editingId ? 'Editar respuesta' : 'Nueva respuesta rapida'}
            </h2>
            <button onClick={closeForm} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Palabras clave</label>
              <p className="mb-2 text-xs text-slate-400">Separadas por coma. Si el mensaje del usuario contiene alguna, se activa esta respuesta.</p>
              <input type="text" value={form.keywords}
                onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                placeholder="horario, hora, abierto, abren"
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-corporate focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Respuesta</label>
              <p className="mb-2 text-xs text-slate-400">Lo que el bot responde. Soporta Markdown (negritas, listas, etc).</p>
              <textarea value={form.response}
                onChange={(e) => setForm((f) => ({ ...f, response: e.target.value }))}
                rows={6} placeholder="**Horarios:**&#10;&#10;Lunes a viernes..."
                className="w-full rounded-lg border border-slate-200 px-4 py-3 font-mono text-sm leading-relaxed text-slate-700 focus:border-corporate focus:outline-none" />
              <div className="mt-1 text-right text-xs text-slate-400">{form.response.length} caracteres</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Prioridad</label>
                <p className="mb-2 text-xs text-slate-400">Mayor numero = se evalua primero.</p>
                <input type="number" min="0" max="100" value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-corporate focus:outline-none" />
              </div>
              <div className="flex items-end">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 accent-corporate" />
                  <span className="font-bold">Activa</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeForm}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button type="submit" disabled={isSaving}
                className="flex items-center gap-2 rounded-lg bg-corporate px-4 py-2 text-sm font-bold text-white hover:bg-corporate/90 disabled:opacity-50">
                <Save size={14} /> {isSaving ? 'Guardando...' : 'Guardar'}
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
          No hay respuestas rapidas configuradas
        </div>
      ) : (
        <div className="space-y-3">
          {replies.map((reply) => (
            <div key={reply.id}
              className={`rounded-xl border bg-white p-4 transition-opacity ${!reply.isActive ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {reply.keywords.map((kw, i) => (
                      <span key={i} className="rounded-full bg-corporate/10 px-2.5 py-0.5 text-xs font-bold text-corporate">
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
                  <button onClick={() => handleToggle(reply)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                    title={reply.isActive ? 'Desactivar' : 'Activar'}>
                    {reply.isActive ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} />}
                  </button>
                  <button onClick={() => { setEditingId(reply.id); setForm({ keywords: reply.keywords.join(', '), response: reply.response, priority: reply.priority, isActive: reply.isActive }); setShowForm(true); }}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600" title="Editar">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(reply.id)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500" title="Eliminar">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
