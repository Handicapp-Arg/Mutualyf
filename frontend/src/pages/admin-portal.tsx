import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  MessageSquare,
  FileText,
  Users,
  TrendingUp,
  Download,
  Trash2,
  Radio,
  LogIn,
  LogOut,
  SendHorizontal,
  Paperclip,
  Loader2,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAdminSocket } from '@/hooks/use-admin-socket';
import { useAuthStore } from '@/stores/auth.store';
import type { ChatMessage } from '@/types';

interface Conversation {
  id: string;
  sessionId: string;
  userName?: string;
  messages: ChatMessage[];
  timestamp: Date;
}

interface UploadedFile {
  id: number;
  sessionId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  description?: string | null;
  uploadedBy: 'user' | 'admin';
  createdAt: string;
}

interface Stats {
  totalConversations: number;
  totalMessages: number;
  totalUploads: number;
  avgMessagesPerConversation: number;
}

interface LiveSession {
  sessionId: string;
  userName?: string | null;
  lastSeen: string;
}

type AdminTab = 'conversations' | 'uploads' | 'stats';
const VALID_TABS: AdminTab[] = ['conversations', 'uploads', 'stats'];

export function AdminPortal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const initialTab: AdminTab = VALID_TABS.includes(tabFromUrl as AdminTab)
    ? (tabFromUrl as AdminTab)
    : 'conversations';
  const [activeTab, setActiveTabState] = useState<AdminTab>(initialTab);

  const setActiveTab = (tab: AdminTab) => {
    setActiveTabState(tab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { replace: true },
    );
  };

  // Sincronizar si el usuario navega con back/forward
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && VALID_TABS.includes(t as AdminTab) && t !== activeTab) {
      setActiveTabState(t as AdminTab);
    }
  }, [searchParams]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalConversations: 0,
    totalMessages: 0,
    totalUploads: 0,
    avgMessagesPerConversation: 0,
  });
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [adminChatSessionId, setAdminChatSessionId] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [isSendingAdmin, setIsSendingAdmin] = useState(false);
  const [adminAttachment, setAdminAttachment] = useState<File | null>(null);
  const [isUploadingAdmin, setIsUploadingAdmin] = useState(false);
  const adminMessagesEndRef = useRef<HTMLDivElement>(null);
  const adminFileInputRef = useRef<HTMLInputElement>(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';

  /** fetch con token JWT automático */
  const authFetch = (url: string, opts?: RequestInit) => {
    const token = useAuthStore.getState().token;
    return fetch(url, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opts?.headers,
      },
    });
  };

  // Set de sessionIds en vivo (para lookup O(1) al renderizar la lista)
  const liveSessionIds = new Set(liveSessions.map((s) => s.sessionId));

  useEffect(() => {
    loadData();
  }, []);

  // Fetch inicial de sesiones en vivo (después el socket toma el control)
  useEffect(() => {
    const fetchLive = async () => {
      try {
        const res = await authFetch(`${BACKEND_URL}/sessions/live/list`);
        if (!res.ok) return;
        const json = await res.json();
        const data = (json.data || []) as LiveSession[];
        setLiveSessions(data);
      } catch {
        // silencioso
      }
    };
    fetchLive();
  }, []);

  // Handler: upsert de una conversación recibida por socket.
  // Si ya existe en el estado (mismo sessionId), la reemplaza in-place;
  // si no, la agrega al inicio. Recalcula stats sobre el array resultante.
  const handleConversationUpserted = useCallback((incoming: Conversation) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.sessionId === incoming.sessionId);
      const next =
        idx >= 0
          ? prev.map((c, i) => (i === idx ? { ...c, ...incoming } : c))
          : [incoming, ...prev];

      // Recalcular stats sobre el array nuevo (fuente única de verdad)
      const totalMessages = next.reduce(
        (acc, conv) => acc + (conv.messages?.length || 0),
        0
      );
      setStats((s) => ({
        ...s,
        totalConversations: next.length,
        totalMessages,
        avgMessagesPerConversation: next.length > 0 ? totalMessages / next.length : 0,
      }));

      return next;
    });

    // Si la conversación abierta en el panel de detalle es la que se actualizó,
    // refrescarla también para que los mensajes nuevos aparezcan en vivo.
    setSelectedConversation((prev) =>
      prev && prev.sessionId === incoming.sessionId ? { ...prev, ...incoming } : prev
    );
  }, []);

  const handleLiveSessions = useCallback((sessions: LiveSession[]) => {
    setLiveSessions(sessions);
  }, []);

  // Entrar a una conversación en vivo como admin
  const handleJoinChat = async (sessionId: string) => {
    try {
      await authFetch(`${BACKEND_URL}/conversations/admin-takeover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, active: true }),
      });
      setAdminChatSessionId(sessionId);
      // Seleccionar la conversación para ver los mensajes
      const conv = conversations.find((c) => c.sessionId === sessionId);
      if (conv) setSelectedConversation(conv);
    } catch (err) {
      console.error('Error al entrar al chat:', err);
    }
  };

  // Abandonar la conversación
  const handleLeaveChat = async () => {
    if (!adminChatSessionId) return;
    try {
      await authFetch(`${BACKEND_URL}/conversations/admin-takeover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: adminChatSessionId, active: false }),
      });
    } catch (err) {
      console.error('Error al abandonar el chat:', err);
    }
    setAdminChatSessionId(null);
  };

  // Enviar mensaje como admin
  const handleSendAdminMessage = async () => {
    const sessionId = adminChatSessionId || selectedConversation?.sessionId;
    if (!sessionId || !adminMessage.trim() || isSendingAdmin) return;
    setIsSendingAdmin(true);
    try {
      await authFetch(`${BACKEND_URL}/conversations/admin-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, content: adminMessage.trim() }),
      });
      setAdminMessage('');
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
    } finally {
      setIsSendingAdmin(false);
    }
  };

  // Obtener el sessionId activo (takeover o conversación seleccionada)
  const getActiveSessionId = (): string | null => {
    return adminChatSessionId || selectedConversation?.sessionId || null;
  };

  // Enviar archivo adjunto como admin
  const handleSendAdminAttachment = async () => {
    const sessionId = getActiveSessionId();
    if (!sessionId || !adminAttachment) return;
    setIsUploadingAdmin(true);
    try {
      const token = useAuthStore.getState().token;
      const formData = new FormData();
      formData.append('file', adminAttachment);
      formData.append('sessionId', sessionId);
      if (adminMessage.trim()) {
        formData.append('caption', adminMessage.trim());
      }

      const res = await fetch(`${BACKEND_URL}/conversations/admin-attachment`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (res.ok) {
        setAdminMessage('');
        setAdminAttachment(null);
      }
    } catch (err) {
      console.error('Error al enviar archivo:', err);
    } finally {
      setIsUploadingAdmin(false);
    }
  };

  // Enviar mensaje o archivo según lo que esté pendiente
  const handleAdminSubmit = async () => {
    if (adminAttachment) {
      await handleSendAdminAttachment();
    } else {
      await handleSendAdminMessage();
    }
  };

  // Scroll automático en el chat del admin
  useEffect(() => {
    adminMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  // Conexión WebSocket: actualizaciones en tiempo real
  useAdminSocket({
    onConversationUpserted: handleConversationUpserted,
    onLiveSessions: handleLiveSessions,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Cargar conversaciones y estadísticas desde /stats
      const statsRes = await authFetch(`${BACKEND_URL}/conversations/stats`);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        console.log('📊 Stats data completo:', JSON.stringify(statsData, null, 2));

        // El backend puede devolver { conversations: [...] } o { data: { conversations: [...] } }
        const data = statsData.data || statsData;
        const allConversations: Conversation[] = data.conversations || [];

        console.log('💬 Total conversaciones encontradas:', allConversations.length);
        allConversations.forEach((conv, idx) => {
          if (idx < 3) {
            // Solo mostrar las primeras 3 en detalle
            console.log(`Conversación ${idx + 1} DETALLE:`, {
              id: conv.id,
              sessionId: conv.sessionId,
              userName: conv.userName,
              totalMensajes: conv.messages?.length || 0,
              mensajesTipo: typeof conv.messages,
              esArray: Array.isArray(conv.messages),
              mensajes: conv.messages,
            });
          }
        });

        setConversations(allConversations);

        // Calcular estadísticas
        const totalMessages = allConversations.reduce(
          (acc: number, conv: Conversation) => acc + (conv.messages?.length || 0),
          0
        );

        const calculatedStats = {
          totalConversations: allConversations.length,
          totalMessages,
          totalUploads: 0, // Se actualizará con los uploads
          avgMessagesPerConversation:
            allConversations.length > 0 ? totalMessages / allConversations.length : 0,
        };

        setStats(calculatedStats);
      }

      // Cargar attachments del chat
      const uploadsRes = await authFetch(`${BACKEND_URL}/conversations/attachments`);
      if (uploadsRes.ok) {
        const uploadsData = await uploadsRes.json();
        const uploadsArray: UploadedFile[] = Array.isArray(uploadsData?.data)
          ? uploadsData.data
          : Array.isArray(uploadsData)
            ? uploadsData
            : [];
        setUploads(uploadsArray);
        setStats((prev) => ({ ...prev, totalUploads: uploadsArray.length }));
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const downloadConversationCSV = () => {
    const csv = [
      ['Sesión', 'Fecha', 'Total Mensajes', 'Último Mensaje'],
      ...conversations.map((conv) => [
        conv.sessionId,
        formatDate(conv.timestamp),
        conv.messages.length.toString(),
        conv.messages[conv.messages.length - 1]?.content.substring(0, 50) || '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversaciones_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleDownloadAttachment = (attachmentId: number) => {
    const url = `${BACKEND_URL}/conversations/attachment/${attachmentId}`;
    window.open(url, '_blank');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 text-sm font-bold text-slate-600 transition-colors hover:text-corporate"
              >
                <ArrowLeft size={20} />
                Volver al sitio
              </Link>
              <div className="h-6 w-px bg-slate-200" />
              <h1 className="text-2xl font-black text-slate-800">
                Portal de Administración - MutuaLyF
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs font-bold text-slate-500">Sistema Activo</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">
                    Conversaciones
                  </p>
                  <p className="mt-1 text-3xl font-black text-corporate">
                    {stats.totalConversations}
                  </p>
                </div>
                <div className="rounded-lg bg-corporate/10 p-3">
                  <MessageSquare className="text-corporate" size={24} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-purple-50 to-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">
                    Mensajes Totales
                  </p>
                  <p className="mt-1 text-3xl font-black text-purple-600">
                    {stats.totalMessages}
                  </p>
                </div>
                <div className="rounded-lg bg-purple-100 p-3">
                  <Users className="text-purple-600" size={24} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-green-50 to-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">
                    Archivos Subidos
                  </p>
                  <p className="mt-1 text-3xl font-black text-green-600">
                    {stats.totalUploads}
                  </p>
                </div>
                <div className="rounded-lg bg-green-100 p-3">
                  <FileText className="text-green-600" size={24} />
                </div>
              </div>
            </div>

            <div
              className={`rounded-xl border p-4 transition-colors ${
                liveSessions.length > 0
                  ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white'
                  : 'border-slate-200 bg-gradient-to-br from-slate-50 to-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">En Línea</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p
                      className={`text-3xl font-black ${
                        liveSessions.length > 0 ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {liveSessions.length}
                    </p>
                    {liveSessions.length > 0 && (
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={`rounded-lg p-3 ${
                    liveSessions.length > 0 ? 'bg-emerald-100' : 'bg-slate-100'
                  }`}
                >
                  <Radio
                    className={
                      liveSessions.length > 0 ? 'text-emerald-600' : 'text-slate-400'
                    }
                    size={24}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('conversations')}
              className={`border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
                activeTab === 'conversations'
                  ? 'border-corporate text-corporate'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={16} />
                Conversaciones
              </div>
            </button>
            <button
              onClick={() => setActiveTab('uploads')}
              className={`border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
                activeTab === 'uploads'
                  ? 'border-corporate text-corporate'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText size={16} />
                Archivos
              </div>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
                activeTab === 'stats'
                  ? 'border-corporate text-corporate'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={16} />
                Estadísticas
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-corporate" />
              <p className="mt-4 text-sm font-bold text-slate-500">Cargando datos...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Conversaciones Tab */}
            {activeTab === 'conversations' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Lista de conversaciones */}
                <div className="rounded-xl border bg-white p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-black text-slate-800">
                      Todas las Conversaciones
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={downloadConversationCSV}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        <Download size={14} />
                        Exportar CSV
                      </button>
                      <button
                        onClick={async () => {
                          if (
                            !window.confirm(
                              '¿Seguro que quieres borrar TODAS las conversaciones?'
                            )
                          )
                            return;
                          try {
                            const res = await authFetch(`${BACKEND_URL}/conversations`, {
                              method: 'DELETE',
                            });
                            if (res.ok) {
                              alert('Base de datos limpiada correctamente');
                            } else {
                              alert('Error al limpiar la base de datos');
                            }
                          } catch (err) {
                            alert('Error de conexión al limpiar la base de datos');
                          }
                          loadData();
                        }}
                        className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-100"
                      >
                        <Trash2 size={14} />
                        Limpiar
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[600px] space-y-2 overflow-y-auto">
                    {conversations.length === 0 ? (
                      <p className="py-8 text-center text-sm text-slate-400">
                        No hay conversaciones registradas
                      </p>
                    ) : (
                      conversations.map((conv) => {
                        const isLive = liveSessionIds.has(conv.sessionId);
                        const isAdminHere = adminChatSessionId === conv.sessionId;
                        return (
                          <div
                            key={conv.id}
                            onClick={() => setSelectedConversation(conv)}
                            className={`w-full cursor-pointer rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
                              isAdminHere
                                ? 'border-orange-500 bg-orange-50 shadow-sm'
                                : isLive
                                  ? 'border-green-500 bg-green-50 shadow-sm'
                                  : selectedConversation?.id === conv.id
                                    ? 'border-corporate bg-blue-50'
                                    : 'border-slate-200 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="mb-1 flex items-center gap-2">
                                  {isLive && (
                                    <span className="relative flex h-2.5 w-2.5">
                                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
                                    </span>
                                  )}
                                  <p
                                    className={`text-sm font-bold ${
                                      isAdminHere ? 'text-orange-700' : isLive ? 'text-green-700' : 'text-corporate'
                                    }`}
                                  >
                                    {conv.userName || 'Anónimo'}
                                  </p>
                                  {isAdminHere && (
                                    <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                                      Admin activo
                                    </span>
                                  )}
                                  {isLive && !isAdminHere && (
                                    <span className="rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                                      En vivo
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-sm font-medium text-slate-700">
                                  {conv.messages.length} mensajes
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  {formatDate(conv.timestamp)}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <div
                                  className={`rounded-full px-3 py-1 ${
                                    isLive ? 'bg-green-500/20' : 'bg-corporate/10'
                                  }`}
                                >
                                  <span
                                    className={`text-xs font-bold ${
                                      isLive ? 'text-green-700' : 'text-corporate'
                                    }`}
                                  >
                                    {conv.messages.filter((m) => m.role === 'user').length}
                                  </span>
                                </div>
                                {isLive && (
                                  isAdminHere ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleLeaveChat(); }}
                                      className="flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-600"
                                    >
                                      <LogOut size={12} />
                                      Abandonar
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleJoinChat(conv.sessionId); }}
                                      disabled={!!adminChatSessionId}
                                      className="flex items-center gap-1 rounded-lg bg-corporate px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-corporate/90 disabled:opacity-50"
                                    >
                                      <LogIn size={12} />
                                      Entrar
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Detalle de conversación */}
                <div className="flex flex-col rounded-xl border bg-white p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-black text-slate-800">
                      Detalle de Conversación
                    </h2>
                    {selectedConversation && adminChatSessionId === selectedConversation.sessionId && (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
                          Chat activo como Admin
                        </span>
                        <button
                          onClick={handleLeaveChat}
                          className="flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-600"
                        >
                          <LogOut size={12} />
                          Abandonar chat
                        </button>
                      </div>
                    )}
                  </div>
                  {selectedConversation ? (
                    <div className="flex flex-1 flex-col">
                      <div className="max-h-[500px] flex-1 space-y-4 overflow-y-auto">
                        {selectedConversation.messages &&
                        Array.isArray(selectedConversation.messages) &&
                        selectedConversation.messages.length > 0 ? (
                          selectedConversation.messages.map((msg: any, idx: number) => (
                            <div
                              key={idx}
                              className={`rounded-lg p-4 ${
                                msg.role === 'user'
                                  ? 'bg-corporate text-white'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              <div className="mb-1 flex items-center justify-between">
                                <span className="text-xs font-bold uppercase opacity-70">
                                  {msg.role === 'user' ? 'Usuario' : 'Asistente'}
                                </span>
                                <span className="text-xs opacity-70">
                                  {formatDate(msg.timestamp)}
                                </span>
                              </div>
                              {msg.content && (
                                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                              )}
                              {msg.attachment && (
                                <a
                                  href={`${BACKEND_URL}/conversations/attachment/${msg.attachment.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs transition-colors ${
                                    msg.role === 'user'
                                      ? 'bg-white/15 hover:bg-white/25'
                                      : 'bg-slate-200/60 hover:bg-slate-200'
                                  }`}
                                >
                                  {msg.attachment.fileType?.startsWith('image/') ? (
                                    <img
                                      src={`${BACKEND_URL}/conversations/attachment/${msg.attachment.id}`}
                                      alt={msg.attachment.fileName}
                                      className="max-h-32 rounded-lg object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <>
                                      <FileText size={16} className="shrink-0" />
                                      <span className="flex-1 truncate font-medium">{msg.attachment.fileName}</span>
                                      <Download size={14} className="shrink-0 opacity-60" />
                                    </>
                                  )}
                                </a>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="rounded-lg bg-yellow-50 p-4 text-center">
                            <p className="text-sm text-yellow-800">
                              No hay mensajes disponibles
                            </p>
                          </div>
                        )}
                        <div ref={adminMessagesEndRef} />
                      </div>

                      {/* Input del admin: siempre visible cuando hay conversación seleccionada */}
                      <div className="mt-4 border-t pt-4">
                        {/* Preview de archivo adjunto del admin */}
                        {adminAttachment && (
                          <div className="mb-2 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                            <Paperclip size={14} className="shrink-0 text-corporate" />
                            <span className="flex-1 truncate text-xs text-slate-600">
                              {adminAttachment.name}
                            </span>
                            <button
                              onClick={() => setAdminAttachment(null)}
                              className="text-xs font-bold text-red-500 hover:text-red-700"
                            >
                              Quitar
                            </button>
                          </div>
                        )}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleAdminSubmit();
                          }}
                          className="flex items-center gap-2"
                        >
                          {/* Input oculto para archivos */}
                          <input
                            type="file"
                            ref={adminFileInputRef}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setAdminAttachment(file);
                              if (adminFileInputRef.current) adminFileInputRef.current.value = '';
                            }}
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => adminFileInputRef.current?.click()}
                            disabled={isSendingAdmin || isUploadingAdmin}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-corporate disabled:opacity-50"
                            title="Adjuntar archivo"
                          >
                            <Paperclip size={18} />
                          </button>
                          <input
                            type="text"
                            value={adminMessage}
                            onChange={(e) => setAdminMessage(e.target.value)}
                            placeholder={adminAttachment ? 'Agregar mensaje (opcional)...' : 'Escribir mensaje como admin...'}
                            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-corporate focus:outline-none focus:ring-1 focus:ring-corporate"
                            disabled={isSendingAdmin || isUploadingAdmin}
                          />
                          <button
                            type="submit"
                            disabled={(!adminMessage.trim() && !adminAttachment) || isSendingAdmin || isUploadingAdmin}
                            className="flex h-10 w-10 items-center justify-center rounded-lg bg-corporate text-white transition-colors hover:bg-corporate/90 disabled:opacity-50"
                          >
                            {isUploadingAdmin ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <SendHorizontal size={18} />
                            )}
                          </button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-64 items-center justify-center">
                      <p className="text-sm text-slate-400">
                        Selecciona una conversación para ver los detalles
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Uploads Tab */}
            {activeTab === 'uploads' && (
              <div className="rounded-xl border bg-white p-6">
                <h2 className="mb-4 text-lg font-black text-slate-800">
                  Archivos subidos
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="pb-3 text-left text-xs font-bold uppercase text-slate-500">
                          Archivo
                        </th>
                        <th className="pb-3 text-left text-xs font-bold uppercase text-slate-500">
                          Descripción
                        </th>
                        <th className="pb-3 text-left text-xs font-bold uppercase text-slate-500">
                          Sesión
                        </th>
                        <th className="pb-3 text-left text-xs font-bold uppercase text-slate-500">
                          Subido por
                        </th>
                        <th className="pb-3 text-left text-xs font-bold uppercase text-slate-500">
                          Fecha
                        </th>
                        <th className="pb-3 text-center text-xs font-bold uppercase text-slate-500">
                          Descargar
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploads.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-8 text-center text-sm text-slate-400"
                          >
                            Aún no se subieron archivos
                          </td>
                        </tr>
                      ) : (
                        uploads.map((upload) => (
                          <tr key={upload.id} className="border-b last:border-0">
                            <td className="py-4">
                              <div className="flex items-center gap-2">
                                <FileText size={16} className="text-corporate" />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-slate-700" title={upload.fileName}>
                                    {upload.fileName}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {formatFileSize(upload.fileSize)} · {upload.fileType || 'archivo'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4">
                              <p className="max-w-xs truncate text-xs text-slate-600" title={upload.description ?? ''}>
                                {upload.description || <span className="italic text-slate-400">sin descripción</span>}
                              </p>
                            </td>
                            <td className="py-4">
                              <span className="font-mono text-xs text-slate-500" title={upload.sessionId}>
                                {upload.sessionId.slice(0, 10)}…
                              </span>
                            </td>
                            <td className="py-4">
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-bold ${
                                  upload.uploadedBy === 'admin'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {upload.uploadedBy === 'admin' ? 'Admin' : 'Usuario'}
                              </span>
                            </td>
                            <td className="py-4">
                              <span className="text-xs text-slate-500">
                                {formatDate(upload.createdAt)}
                              </span>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center justify-center">
                                <button
                                  onClick={() => handleDownloadAttachment(upload.id)}
                                  className="flex items-center gap-1.5 rounded-lg bg-corporate px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-corporate/90"
                                >
                                  <Download size={12} />
                                  Descargar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border bg-white p-6">
                  <h2 className="mb-4 text-lg font-black text-slate-800">
                    Resumen General
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <span className="text-sm font-bold text-slate-600">
                        Total de Conversaciones
                      </span>
                      <span className="text-2xl font-black text-corporate">
                        {stats.totalConversations}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-3">
                      <span className="text-sm font-bold text-slate-600">
                        Mensajes Procesados
                      </span>
                      <span className="text-2xl font-black text-purple-600">
                        {stats.totalMessages}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-3">
                      <span className="text-sm font-bold text-slate-600">
                        Archivos Recibidos
                      </span>
                      <span className="text-2xl font-black text-green-600">
                        {stats.totalUploads}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-600">
                        Promedio Mensajes/Conversación
                      </span>
                      <span className="text-2xl font-black text-orange-600">
                        {stats.avgMessagesPerConversation.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-6">
                  <h2 className="mb-4 text-lg font-black text-slate-800">
                    Actividad Reciente
                  </h2>
                  <div className="space-y-3">
                    {conversations.slice(0, 5).map((conv, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 border-b pb-3 last:border-0"
                      >
                        <div className="mt-1 rounded-full bg-corporate/10 p-2">
                          <MessageSquare size={14} className="text-corporate" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-700">
                            Nueva conversación iniciada
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatDate(conv.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {conversations.length === 0 && (
                      <p className="py-4 text-center text-sm text-slate-400">
                        No hay actividad reciente
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
