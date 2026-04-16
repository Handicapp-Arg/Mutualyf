import { FileText, Download, Paperclip } from 'lucide-react';
import { formatDate, formatFileSize } from '@/lib/utils';
import { PortalLayout } from '@/components/portal/portal-layout';
import { useConversations } from '@/hooks/use-conversations';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';

export function Uploads() {
  const { uploads, isLoading, liveSessions } = useConversations();

  return (
    <PortalLayout liveSessions={liveSessions.length}>
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-corporate" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b bg-white px-6 py-4">
            <h1 className="text-lg font-bold text-slate-800">Archivos</h1>
            <span className="text-xs text-slate-400">{uploads.length} archivos</span>
          </div>
          <div className="p-6">
            <div className="rounded-xl border bg-white p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs font-bold uppercase text-slate-500">
                      <th className="pb-3 pr-4">Archivo</th>
                      <th className="pb-3 pr-4">Descripcion</th>
                      <th className="pb-3 pr-4">Sesion</th>
                      <th className="pb-3 pr-4">Subido por</th>
                      <th className="pb-3 pr-4">Fecha</th>
                      <th className="pb-3 text-center">Descargar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploads.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-slate-400">Aun no se subieron archivos</td></tr>
                    ) : uploads.map((upload) => (
                      <tr key={upload.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            {upload.fileType?.startsWith('image/') ? (
                              <Paperclip size={14} className="text-corporate" />
                            ) : (
                              <FileText size={14} className="text-corporate" />
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-700" title={upload.fileName}>{upload.fileName}</p>
                              <p className="text-[11px] text-slate-400">{formatFileSize(upload.fileSize)} · {upload.fileType || 'archivo'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="max-w-xs truncate text-xs text-slate-600" title={upload.description ?? ''}>
                            {upload.description || <span className="italic text-slate-400">sin descripcion</span>}
                          </p>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="font-mono text-xs text-slate-500" title={upload.sessionId}>
                            {upload.sessionId.slice(0, 10)}…
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            upload.uploadedBy === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {upload.uploadedBy === 'admin' ? 'Admin' : 'Usuario'}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-400">{formatDate(upload.createdAt)}</td>
                        <td className="py-3 text-center">
                          <button onClick={() => window.open(`${BACKEND_URL}/conversations/attachment/${upload.id}`, '_blank')}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-corporate px-3 py-1.5 text-xs font-bold text-white hover:bg-corporate/90">
                            <Download size={12} /> Descargar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </PortalLayout>
  );
}
