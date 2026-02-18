import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MessageSquare,
  FileText,
  Users,
  TrendingUp,
  Download,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  sessionId: string;
  userName?: string;
  messages: Message[];
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
  uploadedAt?: Date;
}

interface Stats {
  totalConversations: number;
  totalMessages: number;
  totalUploads: number;
  avgMessagesPerConversation: number;
}

export function AdminPortal() {
  const [activeTab, setActiveTab] = useState<
    'conversations' | 'uploads' | 'stats' | 'feedback'
  >('conversations');
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

  // @ts-ignore - Vite env variables
  const BACKEND_URL = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:3001/api';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Cargar conversaciones y estadísticas desde /stats
      const statsRes = await fetch(`${BACKEND_URL}/conversations/stats`);

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
          totalFeedbacks: 0,
          positiveFeedbacks: 0,
          negativeFeedbacks: 0,
        };

        setStats(calculatedStats);
      }

      // Cargar archivos subidos
      const uploadsRes = await fetch(`${BACKEND_URL}/uploads/medical-orders`);
      if (uploadsRes.ok) {
        const uploadsData = await uploadsRes.json();
        console.log('📦 Uploads data:', uploadsData);

        // El backend devuelve { success: true, data: [...] }
        let uploadsArray = [];
        if (uploadsData.success && Array.isArray(uploadsData.data)) {
          uploadsArray = uploadsData.data;
        } else if (Array.isArray(uploadsData)) {
          uploadsArray = uploadsData;
        }

        console.log('📋 Uploads array:', uploadsArray);
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

  const handleDownloadOrder = (orderId: number) => {
    const url = `${BACKEND_URL}/uploads/medical-orders/file/${orderId}`;
    window.open(url, '_blank');
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
                Portal de Administración - CIOR
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs font-bold text-slate-500">Sistema Activo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
                    Órdenes Subidas
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

            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-orange-50 to-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">
                    Promedio Mensajes
                  </p>
                  <p className="mt-1 text-3xl font-black text-orange-600">
                    {stats.avgMessagesPerConversation.toFixed(1)}
                  </p>
                </div>
                <div className="rounded-lg bg-orange-100 p-3">
                  <TrendingUp className="text-orange-600" size={24} />
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
                Órdenes Médicas
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
                    <button
                      onClick={downloadConversationCSV}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <Download size={14} />
                      Exportar CSV
                    </button>
                  </div>
                  <div className="max-h-[600px] space-y-2 overflow-y-auto">
                    {conversations.length === 0 ? (
                      <p className="py-8 text-center text-sm text-slate-400">
                        No hay conversaciones registradas
                      </p>
                    ) : (
                      conversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => {
                            console.log('🖱️ Conversación seleccionada:', {
                              id: conv.id,
                              sessionId: conv.sessionId,
                              userName: conv.userName,
                              totalMensajes: conv.messages?.length,
                              esArray: Array.isArray(conv.messages),
                              mensajes: conv.messages,
                            });
                            setSelectedConversation(conv);
                          }}
                          className={`w-full rounded-lg border p-4 text-left transition-all hover:shadow-md ${
                            selectedConversation?.id === conv.id
                              ? 'border-corporate bg-blue-50'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <p className="text-sm font-bold text-corporate">
                                  {conv.userName || 'Anónimo'}
                                </p>
                              </div>
                              <p className="text-xs text-slate-500">
                                Sesión: {conv.sessionId.substring(0, 20)}...
                              </p>
                              <p className="mt-1 text-sm font-medium text-slate-700">
                                {conv.messages.length} mensajes
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {formatDate(conv.timestamp)}
                              </p>
                            </div>
                            <div className="rounded-full bg-corporate/10 px-3 py-1">
                              <span className="text-xs font-bold text-corporate">
                                {conv.messages.filter((m) => m.role === 'user').length}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Detalle de conversación */}
                <div className="rounded-xl border bg-white p-6">
                  <h2 className="mb-4 text-lg font-black text-slate-800">
                    Detalle de Conversación
                  </h2>
                  {selectedConversation ? (
                    <div className="max-h-[600px] space-y-4 overflow-y-auto">
                      {(() => {
                        console.log('🎨 Renderizando mensajes:', {
                          total: selectedConversation.messages?.length,
                          esArray: Array.isArray(selectedConversation.messages),
                          primerMensaje: selectedConversation.messages?.[0],
                          mensajes: selectedConversation.messages,
                        });
                        return null;
                      })()}
                      {selectedConversation.messages &&
                      Array.isArray(selectedConversation.messages) &&
                      selectedConversation.messages.length > 0 ? (
                        selectedConversation.messages.map((msg, idx) => (
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
                            <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg bg-yellow-50 p-4 text-center">
                          <p className="text-sm text-yellow-800">
                            ⚠️ No hay mensajes disponibles o formato incorrecto
                          </p>
                          <p className="mt-2 text-xs text-yellow-600">
                            Tipo: {typeof selectedConversation.messages} | Es Array:{' '}
                            {Array.isArray(selectedConversation.messages) ? 'Sí' : 'No'} |
                            Longitud: {selectedConversation.messages?.length || 0}
                          </p>
                        </div>
                      )}
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
                  Órdenes Médicas Subidas
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="pb-3 text-left text-xs font-bold uppercase text-slate-500">
                          Paciente
                        </th>
                        <th className="pb-3 text-left text-xs font-bold uppercase text-slate-500">
                          DNI
                        </th>
                        <th className="pb-3 text-left text-xs font-bold uppercase text-slate-500">
                          Estudios
                        </th>
                        <th className="pb-3 text-left text-xs font-bold uppercase text-slate-500">
                          Estado
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
                            No hay órdenes médicas cargadas
                          </td>
                        </tr>
                      ) : (
                        uploads.map((upload) => (
                          <tr key={upload.id} className="border-b last:border-0">
                            <td className="py-4">
                              <div className="flex items-center gap-2">
                                <FileText size={16} className="text-corporate" />
                                <div>
                                  <p className="text-sm font-bold text-slate-700">
                                    {upload.patientName}
                                  </p>
                                  {upload.patientPhone && (
                                    <p className="text-xs text-slate-500">
                                      Tel: {upload.patientPhone}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-4">
                              <span className="text-sm font-medium text-slate-600">
                                {upload.patientDNI}
                              </span>
                            </td>
                            <td className="py-4">
                              <div className="max-w-xs">
                                <p className="text-xs text-slate-600">
                                  {upload.requestedStudies.join(', ')}
                                </p>
                              </div>
                            </td>
                            <td className="py-4">
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-bold ${
                                  upload.validationStatus === 'approved'
                                    ? 'bg-green-100 text-green-700'
                                    : upload.validationStatus === 'rejected'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                }`}
                              >
                                {upload.validationStatus === 'approved'
                                  ? 'Aprobada'
                                  : upload.validationStatus === 'rejected'
                                    ? 'Rechazada'
                                    : 'Pendiente'}
                              </span>
                            </td>
                            <td className="py-4">
                              <span className="text-xs text-slate-500">
                                {formatDate(upload.createdAt || upload.uploadedAt)}
                              </span>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center justify-center">
                                <button
                                  onClick={() => handleDownloadOrder(upload.id)}
                                  className="rounded-lg bg-corporate px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-corporate/90"
                                >
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
                        Órdenes Recibidas
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
