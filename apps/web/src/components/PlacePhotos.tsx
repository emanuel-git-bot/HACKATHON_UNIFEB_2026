import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PlacePhoto } from "../lib/campus";
import { cx } from "./ui";

/** Fotos do local: uma grande ou uma fileira para arrastar; tocar abre em tela cheia. */
export function PlacePhotos({ photos, placeName }: { photos: PlacePhoto[]; placeName: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (photos.length === 0) return null;
  const single = photos.length === 1;
  return (
    <>
      <div className={cx("mt-3", !single && "-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1")}>
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            onClick={() => setOpen(i)}
            className={cx(
              "block shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:outline-none",
              single ? "aspect-[16/9] w-full" : "h-32 w-44 snap-start",
            )}
            aria-label={`Ver foto ${i + 1} de ${photos.length}${photo.caption ? `: ${photo.caption}` : ""}`}
          >
            <img
              src={photo.thumbUrl}
              srcSet={`${photo.thumbUrl} 480w, ${photo.url} 1600w`}
              sizes={single ? "(max-width: 672px) 100vw, 640px" : "176px"}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          </button>
        ))}
      </div>
      {open !== null && <PhotoViewer photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} title={placeName} />}
    </>
  );
}

function PhotoViewer({
  photos,
  index,
  onIndex,
  onClose,
  title,
}: {
  photos: PlacePhoto[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  title: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const swipeStart = useRef<number | null>(null);
  const photo = photos[index]!;
  const many = photos.length > 1;
  const go = (step: number) => onIndex((index + step + photos.length) % photos.length);

  // Foco no botão de fechar, sem rolar a página por baixo; ao fechar, o foco volta para a miniatura.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (many && e.key === "ArrowRight") go(1);
      else if (many && e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  function endSwipe(e: PointerEvent) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (start === null || !many) return;
    const dx = e.clientX - start;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos de ${title}`}
      className="fixed inset-0 z-[2000] flex touch-pan-y touch-pinch-zoom flex-col bg-black/95 text-white"
      onPointerDown={(e) => (swipeStart.current = e.clientX)}
      onPointerUp={endSwipe}
    >
      <div className="flex items-center gap-3 p-3">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">
          {title}
          {many && <span className="font-normal text-white/70"> · {index + 1} de {photos.length}</span>}
        </p>
        <button
          ref={closeRef}
          onClick={onClose}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          aria-label="Fechar fotos"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
        <img key={photo.id} src={photo.url} alt={photo.caption ?? `Foto de ${title}`} className="animate-result max-h-full max-w-full rounded-lg object-contain" />
        {many && (
          <>
            <button
              onClick={() => go(-1)}
              className="absolute left-2 flex size-11 items-center justify-center rounded-full bg-black/50 hover:bg-black/70"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="size-6" aria-hidden />
            </button>
            <button
              onClick={() => go(1)}
              className="absolute right-2 flex size-11 items-center justify-center rounded-full bg-black/50 hover:bg-black/70"
              aria-label="Próxima foto"
            >
              <ChevronRight className="size-6" aria-hidden />
            </button>
          </>
        )}
      </div>
      <p className="min-h-14 p-4 text-center text-sm text-white/90">{photo.caption}</p>
    </div>,
    document.body,
  );
}
