import { PortalLayout } from '@/components/portal/portal-layout';
import { useConversations } from '@/hooks/use-conversations';

export function Stats() {
  const { stats, liveSessions, isLoading } = useConversations();

  return (
    <PortalLayout liveSessions={liveSessions.length}>
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-corporate" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b bg-white px-6 py-4">
            <h1 className="text-lg font-bold text-slate-800">Estadisticas</h1>
          </div>
          <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
            <div className="rounded-xl border bg-white p-6">
              <h3 className="mb-4 text-lg font-black text-slate-800">Resumen</h3>
              <div className="space-y-3">
                <SummaryRow label="Total conversaciones" value={stats.totalConversations} color="text-corporate" />
                <SummaryRow label="Total mensajes" value={stats.totalMessages} color="text-purple-600" />
                <SummaryRow label="Promedio mensajes/conv" value={stats.avgMessagesPerConversation.toFixed(1)} color="text-green-600" />
                <SummaryRow label="Archivos subidos" value={stats.totalUploads} color="text-orange-600" />
              </div>
            </div>
            <div className="rounded-xl border bg-white p-6">
              <h3 className="mb-4 text-lg font-black text-slate-800">Sesiones en Vivo</h3>
              {liveSessions.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No hay sesiones activas</p>
              ) : (
                <div className="space-y-2">
                  {liveSessions.map((session) => (
                    <div key={session.sessionId}
                      className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
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
    </PortalLayout>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}
