import { useRef } from 'react';
import {
  MessageSquare, FileText, TrendingUp, Download, Trash2, Radio,
  LogIn, LogOut, SendHorizontal, Paperclip, Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { PortalLayout } from '@/components/portal/portal-layout';
import { useConversations } from '@/hooks/use-conversations';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';

export function Conversations() {
  const { hasPermission } = useAuthStore();
  const canDelete = hasPermission('conversations:delete');
  const canTakeover = hasPermission('conversations:takeover');

  const adminFileInputRef = useRef<HTMLInputElement>(null);

  const {
    conversations, stats, isLoading, liveSessions, liveSessionIds,
    selectedConversation, setSelectedConversation,
    adminChatSessionId, adminMessage, setAdminMessage,
    isSendingAdmin, isSendingAdminFile, adminMessagesEndRef,
    joinChat, leaveChat, sendAdminMessage, sendAdminAttachment, loadData,
  } = useConversations();

  const handleAdminFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    sendAdminAttachment(file);
    e.target.value = '';
  };

  const downloadCSV = () => {
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

  return (
    <PortalLayout liveSessions={liveSessions.length}>
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-corporate" />
            <p className="mt-4 text-sm font-bold text-slate-500">Cargando...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-white px-6 py-4">
            <h1 className="text-lg font-bold text-slate-800">Conversaciones</h1>
            <div className="flex items-center gap-2">
              <button onClick={downloadCSV}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                <Download size={14} />CSV
              </button>
              {canDelete && (
                <button onClick={async () => {
                  if (!window.confirm('Seguro que quieres borrar TODAS las conversaciones?')) return;
                  try { await apiClient.delete('/conversations'); loadData(); }
                  catch { alert('Error al limpiar'); }
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
              <StatCard icon={MessageSquare} iconBg="bg-corporate/10" iconColor="text-corporate"
                value={stats.totalConversations} label="Conversaciones" />
              <StatCard icon={TrendingUp} iconBg="bg-purple-50" iconColor="text-purple-500"
                value={stats.totalMessages} label="Mensajes" />
              <StatCard icon={FileText} iconBg="bg-green-50" iconColor="text-green-500"
                value={stats.totalUploads} label="Archivos" />
              <div className={`rounded-lg border px-4 py-3 ${liveSessions.length > 0 ? 'border-emerald-200 bg-emerald-50' : 'bg-white'}`}>
                <div className="flex items-center gap-3">
                  <div className={`rounded-md p-2 ${liveSessions.length > 0 ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                    <Radio className={liveSessions.length > 0 ? 'text-emerald-500' : 'text-slate-400'} size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`text-2xl font-black ${liveSessions.length > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {liveSessions.length}
                      </p>
                      {liveSessions.length > 0 && (
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
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
            {/* Lista */}
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
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
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
                              <button onClick={(e) => { e.stopPropagation(); leaveChat(); }}
                                className="flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600">
                                <LogOut size={12} />Abandonar
                              </button>
                            ) : (
                              <button onClick={(e) => { e.stopPropagation(); joinChat(conv.sessionId); }}
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

            {/* Detalle */}
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
                    {selectedConversation.messages.map((msg: any, idx: number) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-xl px-4 py-2 ${
                          msg.role === 'user' ? 'bg-corporate text-white'
                          : msg.role === 'admin' ? 'bg-orange-100 text-orange-900'
                          : 'bg-slate-100 text-slate-800'
                        }`}>
                          {msg.role === 'admin' && <p className="mb-1 text-[10px] font-bold uppercase">Admin</p>}
                          {msg.content && <p className="whitespace-pre-wrap text-sm">{msg.content}</p>}
                          {msg.attachment && (
                            <a href={`${BACKEND_URL}/conversations/attachment/${msg.attachment.id}`}
                              target="_blank" rel="noopener noreferrer"
                              className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                                msg.role === 'user' ? 'bg-white/15 hover:bg-white/25' : 'bg-slate-200/60 hover:bg-slate-200'
                              }`}>
                              {msg.attachment.fileType?.startsWith('image/') ? (
                                <img src={`${BACKEND_URL}/conversations/attachment/${msg.attachment.id}`}
                                  alt={msg.attachment.fileName} className="max-h-32 rounded-lg object-cover" loading="lazy" />
                              ) : (
                                <>
                                  <FileText size={14} className="shrink-0" />
                                  <span className="flex-1 truncate font-medium">{msg.attachment.fileName}</span>
                                  <Download size={12} className="shrink-0 opacity-70" />
                                </>
                              )}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={adminMessagesEndRef} />
                  </div>
                  {adminChatSessionId === selectedConversation.sessionId && canTakeover && (
                    <div className="mt-4 flex items-center gap-2 border-t pt-4">
                      <input
                        type="file"
                        ref={adminFileInputRef}
                        onChange={handleAdminFileChange}
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => adminFileInputRef.current?.click()}
                        disabled={isSendingAdminFile}
                        title="Adjuntar archivo"
                        className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:border-corporate/30 hover:text-corporate disabled:opacity-40"
                      >
                        {isSendingAdminFile
                          ? <Loader2 size={18} className="animate-spin" />
                          : <Paperclip size={18} />
                        }
                      </button>
                      <input type="text" value={adminMessage}
                        onChange={(e) => setAdminMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendAdminMessage()}
                        placeholder="Escribir mensaje..."
                        className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-corporate focus:outline-none" />
                      <button onClick={sendAdminMessage}
                        disabled={isSendingAdmin || !adminMessage.trim()}
                        className="rounded-lg bg-corporate p-2 text-white hover:bg-corporate/90 disabled:opacity-50">
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
    </PortalLayout>
  );
}

function StatCard({ icon: Icon, iconBg, iconColor, value, label }: {
  icon: React.ElementType; iconBg: string; iconColor: string; value: number; label: string;
}) {
  return (
    <div className="rounded-lg border bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <div className={`rounded-md p-2 ${iconBg}`}>
          <Icon className={iconColor} size={18} />
        </div>
        <div>
          <p className="text-2xl font-black text-slate-800">{value}</p>
          <p className="text-[11px] font-medium text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
