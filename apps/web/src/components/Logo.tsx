export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-extrabold tracking-tight">
      <img src="/icon.svg" alt="" className="size-8" />
      <span className={light ? "text-white" : "text-brand-900"}>
        Sync<span className={light ? "text-accent" : "text-brand-600"}>FEB</span>
      </span>
    </span>
  );
}
