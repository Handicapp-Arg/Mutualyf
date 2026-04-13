import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare,
  FileText,
  TrendingUp,
  Download,
  Trash2,
  Radio,
  LogIn,
  LogOut,
  SendHorizontal,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAdminSocket } from '@/hooks/use-admin-socket';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api-client';
import { PortalLayout } from '@/components/portal/portal-layout';
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
  patientDNI: string;
  patientName: string;
  patientPhone?: string;
  orderDate: string;
  doctorName?: string;
  doctorLicense?: string;
  healthInsurance?: string;
  requestedStudies: string[];
  validationStatus: string;
  createdAt: Date;
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

export function PortalDashboard() {
  const { user, hasPermission } = useAuthStore();
  const [searchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') || 'conversations') as 'conversations' | 'uploads' | 'stats';
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalConversations: 0,
    totalMessages: 0,
    totalUploads: 0,
    avgMessagesPerConversation: 0,
  });
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [adminChatSessionId, setAdminChatSessionId] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [isSendingAdmin, setIsSendingAdmin] = useState(false);
  const adminMessagesEndRef = useRef<HTMLDivElement>(null);

  const liveSessionIds = new Set(liveSessions.map((s) => s.sessionId));

  const canReadConversations = hasPermission('conversations:read');
  const canDeleteConversations = hasPermission('conversations:delete');
  const canTakeover = hasPermission('conversations:takeover');
  const canReadUploads = hasPermission('uploads:read');
  const canReadSessions = hasPermission('sessions:read');

  useEffect(() => {
    if (user) {
      loadData();
      if (hasPermission('sessions:live')) {
        apiClient.get('/sessions/live/list')
          .then((res) => setLiveSessions(Array.isArray(res.data) ? res.data : []))
          .catch(() => {});
      }
    }
  }, [user]);

  const handleConversationUpserted = useCallback((incoming: Conversation) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.sessionId === incoming.sessionId);
      const next = idx >= 0
        ? prev.map((c, i) => (i === idx ? { ...c, ...incoming } : c))
        : [incoming, ...prev];

      const totalMessages = next.reduce((acc, conv) => acc + (conv.messages?.length || 0), 0);
      setStats((s) => ({
        ...s,
        totalConversations: next.length,
        totalMessages,
        avgMessagesPerConversation: next.length > 0 ? totalMessages / next.length : 0,
      }));

      return next;
    });

    setSelectedConversation((prev) =>
      prev && prev.sessionId === incoming.sessionId ? { ...prev, ...incoming } : prev
    );
  }, []);

  const handleLiveSessions = useCallback((sessions: LiveSession[]) => {
    setLiveSessions(sessions);
  }, []);

  const handleJoinChat = async (sessionId: string) => {
    try {
      await apiClient.post('/conversations/admin-takeover', { sessionId, active: true });
      setAdminChatSessionId(sessionId);
      const conv = conversations.find((c) => c.sessionId === sessionId);
      if (conv) setSelectedConversation(conv);
    } catch (err) {
      console.error('Error al entrar al chat:', err);
    }
  };

  const handleLeaveChat = async () => {
    if (!adminChatSessionId) return;
    try {
      await apiClient.post('/conversations/admin-takeover', { sessionId: adminChatSessionId, active: false });
    } catch (err) {
      console.error('Error al abandonar el chat:', err);
    }
    setAdminChatSessionId(null);
  };

  const handleSendAdminMessage = async () => {
    if (!adminChatSessionId || !adminMessage.trim() || isSendingAdmin) return;
    setIsSendingAdmin(true);
    try {
      await apiClient.post('/conversations/admin-message', {
        sessionId: adminChatSessionId,
        content: adminMessage.trim(),
      });
      setAdminMessage('');
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
    } finally {
      setIsSendingAdmin(false);
    }
  };

  useEffect(() => {
    adminMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  useAdminSocket({
    onConversationUpserted: handleConversationUpserted,
    onLiveSessions: handleLiveSessions,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (canReadConversations) {
        const statsRes = await apiClient.get('/conversations/stats');
        const data = statsRes.data;
        const allConversations: Conversation[] = data.conversations || [];
        setConversations(allConversations);

        const totalMessages = allConversations.reduce(
          (acc: number, conv: Conversation) => acc + (conv.messages?.length || 0), 0
        );
        setStats((prev) => ({
          ...prev,
          totalConversations: allConversations.length,
          totalMessages,
          avgMessagesPerConversation: allConversations.length > 0 ? totalMessages / allConversations.length : 0,
        }));
      }

      if (canReadUploads) {
        const uploadsRes = await apiClient.get('/uploads/medical-orders');
        const uploadsArray = Array.isArray(uploadsRes.data) ? uploadsRes.data : [];
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
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const downloadConversationCSV = () => {
    const csv = [
      ['Sesion', 'Fecha', 'Total Mensajes', 'Ultimo Mensaje'],
      ...conversations.map((conv) => [
        conv.sessionId,
        formatDate(conv.timestamp),
        conv.messages.length.toString(),
        conv.messages[conv.messages.length - 1]?.content.substring(0, 50) || '',
      ]),
    ].map((row) => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversaciones_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleDownloadOrder = (orderId: number) => {
    const token = useAuthStore.getState().token;
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';
    window.open(`${BACKEND_URL}/uploads/medical-orders/file/${orderId}?token=${token}`, '_blank');
  };

  return (
    <PortalLayout liveSessions={liveSessions.length}>
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-corporate" />
            <p className="mt-4 text-sm font-bold text-slate-500">Cargando datos...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Conversations Tab */}
          {activeTab === 'conversations' && canReadConversations && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between border-b bg-white px-6 py-4">
                <h1 className="text-lg font-bold text-slate-800">Conversaciones</h1>
                <div className="flex items-center gap-2">
                  <button onClick={downloadConversationCSV}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    <Download size={14} />CSV
                  </button>
                  {canDeleteConversations && (
                    <button onClick={async () => {
                      if (!window.confirm('Seguro que quieres borrar TODAS las conversaciones?')) return;
                      try {
                        await apiClient.delete('/conversations');
                        loadData();
                      } catch { alert('Error al limpiar'); }
                    }}
                      className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-100">
                      <Trash2 size={14} />Limpiar
                    </button>
                  )}
                </div>
              </div>
              {/* Stats cards */}
              <div className="px-6 pt-6">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <div className="rounded-lg border bg-white px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-corporate/10 p-2">
                        <MessageSquare className="text-corporate" size={18} />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-slate-800">{stats.totalConversations}</p>
                        <p className="text-[11px] font-medium text-slate-400">Conversaciones</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-white px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-purple-50 p-2">
                        <TrendingUp className="text-purple-500" size={18} />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-slate-800">{stats.totalMessages}</p>
                        <p className="text-[11px] font-medium text-slate-400">Mensajes</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-white px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-green-50 p-2">
                        <FileText className="text-green-500" size={18} />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-slate-800">{stats.totalUploads}</p>
                        <p className="text-[11px] font-medium text-slate-400">Ordenes</p>
                      </div>
                    </div>
                  </div>
                  <div className={`rounded-lg border px-4 py-3 ${liveSessions.length > 0 ? 'border-emerald-200 bg-emerald-50' : 'bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`rounded-md p-2 ${liveSessions.length > 0 ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                        <Radio className={liveSessions.length > 0 ? 'text-emerald-500' : 'text-slate-400'} size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`text-2xl font-black ${liveSessions.length > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>{liveSessions.length}</p>
                          {liveSessions.length > 0 && (
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-slate-400">En linea</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Lista + Detalle */}
              <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
                <div className="rounded-xl border bg-white p-6">
                  <div className="max-h-[600px] space-y-2 overflow-y-auto">
                    {conversations.length === 0 ? (
                      <p className="py-8 text-center text-sm text-slate-400">No hay conversaciones</p>
                    ) : conversations.map((conv) => {
                      const isLive = liveSessionIds.has(conv.sessionId);
                      const isAdminHere = adminChatSessionId === conv.sessionId;
                      return (
                        <div key={conv.id} onClick={() => setSelectedConversation(conv)}
                          className={`w-full cursor-pointer rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
                            isAdminHere ? 'border-orange-500 bg-orange-50 shadow-sm'
                            : isLive ? 'border-green-500 bg-green-50 shadow-sm'
                            : selectedConversation?.id === conv.id ? 'border-corporate bg-blue-50'
                            : 'border-slate-200 bg-white'
                          }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                {isLive && (
                                  <span className="relative flex h-2.5 w-2.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
                                  </span>
                                )}
                                <p className={`text-sm font-bold ${isAdminHere ? 'text-orange-700' : isLive ? 'text-green-700' : 'text-corporate'}`}>
                                  {conv.userName || 'Anonimo'}
                                </p>
                                {isAdminHere && <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black uppercase text-white">Admin activo</span>}
                                {isLive && !isAdminHere && <span className="rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-black uppercase text-white">En vivo</span>}
                              </div>
                              <p className="mt-1 text-sm font-medium text-slate-700">{conv.messages.length} mensajes</p>
                              <p className="mt-1 text-xs text-slate-400">{formatDate(conv.timestamp)}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className={`rounded-full px-3 py-1 ${isLive ? 'bg-green-500/20' : 'bg-corporate/10'}`}>
                                <span className={`text-xs font-bold ${isLive ? 'text-green-700' : 'text-corporate'}`}>
                                  {conv.messages.filter((m) => m.role === 'user').length}
                                </span>
                              </div>
                              {isLive && canTakeover && (
                                isAdminHere ? (
                                  <button onClick={(e) => { e.stopPropagation(); handleLeaveChat(); }}
                                    className="flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600">
                                    <LogOut size={12} />Abandonar
                                  </button>
                                ) : (
                                  <button onClick={(e) => { e.stopPropagation(); handleJoinChat(conv.sessionId); }}
                                    disabled={!!adminChatSessionId}
                                    className="flex items-center gap-1 rounded-lg bg-corporate px-3 py-1.5 text-xs font-bold text-white hover:bg-corporate/90 disabled:opacity-50">
                                    <LogIn size={12} />Entrar
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Detalle de conversacion */}
                <div className="flex flex-col rounded-xl border bg-white p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-black text-slate-800">Detalle</h2>
                    {selectedConversation && adminChatSessionId === selectedConversation.sessionId && (
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">Chat activo</span>
                    )}
                  </div>
                  {selectedConversation ? (
                    <div className="flex flex-1 flex-col">
                      <div className="mb-3 rounded-lg bg-slate-50 p-3">
                        <p className="text-sm font-bold text-slate-700">{selectedConversation.userName || 'Anonimo'}</p>
                        <p className="text-xs text-slate-400">Session: {selectedConversation.sessionId.substring(0, 20)}...</p>
                      </div>
                      <div className="flex-1 space-y-3 overflow-y-auto" style={{ maxHeight: '500px' }}>
                        {selectedConversation.messages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-xl px-4 py-2 ${
                              msg.role === 'user' ? 'bg-corporate text-white' : msg.role === 'admin' ? 'bg-orange-100 text-orange-900' : 'bg-slate-100 text-slate-800'
                            }`}>
                              {msg.role === 'admin' && <p className="mb-1 text-[10px] font-bold uppercase">Admin</p>}
                              <p className="text-sm">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                        <div ref={adminMessagesEndRef} />
                      </div>
                      {adminChatSessionId === selectedConversation.sessionId && canTakeover && (
                        <div className="mt-4 flex items-center gap-2 border-t pt-4">
                          <input
                            type="text"
                            value={adminMessage}
                            onChange={(e) => setAdminMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendAdminMessage()}
                            placeholder="Escribir mensaje..."
                            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-corporate focus:outline-none"
                          />
                          <button
                            onClick={handleSendAdminMessage}
                            disabled={isSendingAdmin || !adminMessage.trim()}
                            className="rounded-lg bg-corporate p-2 text-white transition-colors hover:bg-corporate/90 disabled:opacity-50"
                          >
                            <SendHorizontal size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center">
                      <p className="text-sm text-slate-400">Selecciona una conversacion</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Uploads Tab */}
          {activeTab === 'uploads' && canReadUploads && (
            <>
              <div className="flex items-center justify-between border-b bg-white px-6 py-4">
                <h1 className="text-lg font-bold text-slate-800">Ordenes Medicas</h1>
              </div>
              <div className="p-6">
                <div className="rounded-xl border bg-white p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-xs font-bold uppercase text-slate-500">
                          <th className="pb-3 pr-4">Paciente</th>
                          <th className="pb-3 pr-4">DNI</th>
                          <th className="pb-3 pr-4">Estudios</th>
                          <th className="pb-3 pr-4">Estado</th>
                          <th className="pb-3 pr-4">Fecha</th>
                          <th className="pb-3">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploads.map((upload) => (
                          <tr key={upload.id} className="border-b last:border-0">
                            <td className="py-3 pr-4 font-medium text-slate-700">{upload.patientName}</td>
                            <td className="py-3 pr-4 text-slate-500">{upload.patientDNI}</td>
                            <td className="py-3 pr-4 text-slate-500">
                              {(Array.isArray(upload.requestedStudies) ? upload.requestedStudies : JSON.parse(upload.requestedStudies as any || '[]')).join(', ')}
                            </td>
                            <td className="py-3 pr-4">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                upload.validationStatus === 'validated' ? 'bg-green-100 text-green-700'
                                : upload.validationStatus === 'rejected' ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {upload.validationStatus === 'validated' ? 'Validado' : upload.validationStatus === 'rejected' ? 'Rechazado' : 'Pendiente'}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-xs text-slate-400">{formatDate(upload.createdAt)}</td>
                            <td className="py-3">
                              <button onClick={() => handleDownloadOrder(upload.id)}
                                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50">
                                <Download size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {uploads.length === 0 && (
                          <tr><td colSpan={6} className="py-8 text-center text-slate-400">No hay ordenes medicas</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && canReadSessions && (
            <>
              <div className="flex items-center justify-between border-b bg-white px-6 py-4">
                <h1 className="text-lg font-bold text-slate-800">Estadisticas</h1>
              </div>
              <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
                <div className="rounded-xl border bg-white p-6">
                  <h3 className="mb-4 text-lg font-black text-slate-800">Resumen</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                      <span className="text-sm text-slate-600">Total conversaciones</span>
                      <span className="font-bold text-corporate">{stats.totalConversations}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                      <span className="text-sm text-slate-600">Total mensajes</span>
                      <span className="font-bold text-purple-600">{stats.totalMessages}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                      <span className="text-sm text-slate-600">Promedio mensajes/conv</span>
                      <span className="font-bold text-green-600">{stats.avgMessagesPerConversation.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                      <span className="text-sm text-slate-600">Ordenes medicas</span>
                      <span className="font-bold text-orange-600">{stats.totalUploads}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border bg-white p-6">
                  <h3 className="mb-4 text-lg font-black text-slate-800">Sesiones en Vivo</h3>
                  {liveSessions.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">No hay sesiones activas</p>
                  ) : (
                    <div className="space-y-2">
                      {liveSessions.map((session) => (
                        <div key={session.sessionId} className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                            </span>
                            <span className="text-sm font-medium text-green-800">{session.userName || 'Anonimo'}</span>
                          </div>
                          <span className="text-xs text-green-600">{session.sessionId.substring(0, 15)}...</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </PortalLayout>
  );
}
