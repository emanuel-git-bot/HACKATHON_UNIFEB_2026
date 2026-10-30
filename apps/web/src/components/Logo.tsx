/** Símbolo do Campus FEB: capelo de formatura sobre um pino de mapa. O capelo usa a cor do texto (`currentColor`). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="136 62 498 556" width="29" height="32" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M156 168 L375 76 Q385 72 395 76 L614 168 Q624 172 614 176 L550 204 Q386 152 222 204 L156 176 Q146 172 156 168 Z"
      />
      <path fill="currentColor" d="M232 214 Q386 162 540 214 L540 284 Q386 232 232 284 Z" />
      <path
        fill="currentColor"
        d="M174 184 h11 v74 h-11 Z M195.5 262 A16 16 0 1 1 163.5 262 A16 16 0 1 1 195.5 262 Z M171 276 L188 276 L199 340 Q200 348 192 348 L167 348 Q159 348 160 340 Z"
      />
      <path
        className="fill-gold-500"
        fillRule="evenodd"
        d="M232 296 Q386 244 540 296 C540 386 452 494 397 590 Q386 608 375 590 C320 494 232 386 232 296 Z M320 348 A66 66 0 1 0 452 348 A66 66 0 1 0 320 348 Z"
      />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  const color = light ? "text-white" : "text-brand-900";
  return (
    <span className="inline-flex items-center gap-2 font-extrabold tracking-tight">
      <LogoMark className={`shrink-0 ${color}`} />
      <span className={color}>
        Campus<span className="text-gold-500"> FEB</span>
      </span>
    </span>
  );
}
