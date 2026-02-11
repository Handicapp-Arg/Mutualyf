/**
 * Cara animada del Bot Nexus
 * Diseño SVG custom con animaciones
 */
export function BotFace() {
  return (
    <div className="relative flex h-full w-full animate-[float_4s_ease-in-out_infinite] items-center justify-center">
      <div className="flex h-14 w-14 flex-col items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md">
        {/* Antena */}
        <div className="absolute -top-2 h-3 w-1 rounded-full bg-white">
          <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
        </div>

        {/* Ojos */}
        <div className="flex gap-3">
          <div className="bot-eye h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          <div className="bot-eye h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
        </div>

        {/* Boca / Visor */}
        <div className="h-1 w-8 overflow-hidden rounded-full bg-cyan-400/30">
          <div className="h-full w-1/2 animate-[shimmer_1.5s_infinite] bg-cyan-400" />
        </div>
      </div>
    </div>
  );
}
