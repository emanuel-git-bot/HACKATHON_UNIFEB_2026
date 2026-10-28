import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "./ui";

export interface SiteBanner {
  imageUrl: string;
  linkUrl: string | null;
}

const AUTOPLAY_MS = 6000;

/**
 * Carrossel dos banners do site do UNIFEB. Só baixa o banner da vez e o próximo
 * (as imagens do site são pesadas para o 4G).
 */
export function BannerCarousel({ banners }: { banners: SiteBanner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = banners.length;
  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  useEffect(() => {
    const reduce =
      document.documentElement.classList.contains("a11y-reduce-motion") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (count < 2 || paused || reduce) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [count, paused]);

  // Pré-carrega o próximo para a troca não piscar.
  useEffect(() => {
    const next = banners[(index + 1) % count];
    if (next) new Image().src = next.imageUrl;
  }, [index, banners, count]);

  if (count === 0) return null;
  const current = banners[index]!;
  const image = (
    <img
      key={current.imageUrl}
      src={current.imageUrl}
      alt={`Destaque ${index + 1} de ${count} do site do UNIFEB`}
      className="animate-result aspect-[3/1] w-full bg-brand-900 object-cover"
    />
  );

  return (
    <section
      aria-label="Destaques do site do UNIFEB"
      aria-roledescription="carrossel"
      className="relative overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-200"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        if (start !== null && end !== undefined && Math.abs(end - start) > 40) go(end < start ? 1 : -1);
        touchX.current = null;
      }}
    >
      {current.linkUrl ? (
        <a href={current.linkUrl} target="_blank" rel="noreferrer">
          {image}
        </a>
      ) : (
        image
      )}
      {count > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            className="absolute left-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
            aria-label="Destaque anterior"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            onClick={() => go(1)}
            className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
            aria-label="Próximo destaque"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
          <div className="absolute inset-x-0 bottom-1.5 flex justify-center gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.imageUrl}
                onClick={() => setIndex(i)}
                aria-label={`Ir para o destaque ${i + 1}`}
                aria-current={i === index}
                className={cx("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-white" : "w-1.5 bg-white/60")}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
