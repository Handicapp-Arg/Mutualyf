export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-md">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-corporate/10">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-corporate"
          >
            <path
              d="M8.5 2C6.5 2 5 3.5 5 5.5V8c0 1.5 1 2.5 1.5 3c-1 1-1.5 2.5-1.5 4v3c0 1.5 1.5 3 3 3h.5c1 0 1.5-.5 1.5-1.5V16c0-.5.5-1 1-1s1 .5 1 1v3.5c0 1 .5 1.5 1.5 1.5h.5c1.5 0 3-1.5 3-3v-3c0-1.5-.5-3-1.5-4c.5-.5 1.5-1.5 1.5-3V5.5C19 3.5 17.5 2 15.5 2c-1.5 0-2.5 1-3.5 2c-1-1-2-2-3.5-2z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-slate-600">
            Escribiendo
          </span>
          <span className="flex gap-1">
            <span className="text-corporate">.</span>
            <span className="text-corporate">.</span>
            <span className="text-corporate">.</span>
          </span>
        </div>
      </div>
    </div>
  );
}
