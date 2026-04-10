import { FileText, Cpu } from 'lucide-react';

export const AnalyzingOrderLoader = ({ progress }: { progress: number }) => {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-6 py-10">
      {/* Container Circular Moderno */}
      <div className="relative flex items-center justify-center">
        {/* SVG Circle Progress - Fondo */}
        <div className="relative h-24 w-24">
          <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
            {/* Track background */}
            <circle
              className="text-slate-100"
              strokeWidth="6"
              stroke="currentColor"
              fill="transparent"
              r="42"
              cx="50"
              cy="50"
            />

            {/* Progress bar */}
            <circle
              className="text-corporate transition-all duration-300 ease-out"
              strokeWidth="6"
              strokeDasharray={264}
              strokeDashoffset={264 - (264 * progress) / 100}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="42"
              cx="50"
              cy="50"
            />
          </svg>

          {/* Icono central */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-corporate-50 text-corporate">
              {progress < 100 ? (
                <FileText className="h-7 w-7 animate-pulse" />
              ) : (
                <Cpu className="h-7 w-7" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info de texto limpia */}
      <div className="flex flex-col items-center gap-1 text-center">
        <h3 className="text-base font-semibold text-slate-800">Analizando documento</h3>
        <p className="text-sm font-medium text-slate-500">
          {Math.round(progress)}% completado
        </p>
      </div>
    </div>
  );
};
