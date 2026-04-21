import { useState } from 'react';
import { BACKEND_URL } from '@/lib/constants';

interface HumanHandoffOfferProps {
  sessionId: string;
  userName: string;
  onAccepted: () => void;
  onDismissed: () => void;
}

export function HumanHandoffOffer({ sessionId, userName, onAccepted, onDismissed }: HumanHandoffOfferProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleYes = async () => {
    setLoading(true);
    try {
      await fetch(`${BACKEND_URL}/sessions/request-human`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userName }),
      });
      setDone(true);
      onAccepted();
    } catch {
      // silencioso — igual mostramos confirmación
      setDone(true);
      onAccepted();
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="mb-3 flex justify-start">
        <div className="max-w-[85%] rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          Perfecto, le avisamos a un asesor. En cuanto se conecte te lo hacemos saber. 🙂
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3 flex justify-start">
      <div className="max-w-[85%] rounded-xl border border-corporate/20 bg-white px-4 py-3 shadow-sm">
        <p className="mb-3 text-sm text-slate-700">
          Parece que no pude resolver tu consulta. ¿Querés que te conecte con un asesor?
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleYes}
            disabled={loading}
            className="rounded-lg bg-corporate px-4 py-1.5 text-xs font-semibold text-white hover:bg-corporate/90 disabled:opacity-50"
          >
            {loading ? 'Avisando...' : 'Sí, quiero'}
          </button>
          <button
            onClick={onDismissed}
            className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
          >
            No, gracias
          </button>
        </div>
      </div>
    </div>
  );
}
