import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import type { AttendanceStatus } from "../lib/types";
import { STATUS_LABELS } from "../lib/format";

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "danger" | "success" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-800 text-white hover:bg-brand-900 focus-visible:outline-brand-800",
  secondary: "bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 focus-visible:outline-brand-800",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-emerald-600",
  ghost: "text-slate-700 hover:bg-slate-100 focus-visible:outline-brand-800",
};

export function Button({
  variant = "primary",
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
        "focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

const inputClass =
  "block w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-base text-slate-900 ring-1 ring-slate-300 " +
  "placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600 focus:outline-none sm:text-sm";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputClass, "min-h-11", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputClass, "min-h-11", props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(inputClass, props.className)} />;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200", className)}>{children}</div>;
}

export function Spinner({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-slate-500" role="status">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200" role="alert">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 px-6 py-10 text-center">
      <div className="text-slate-400">{icon}</div>
      <p className="font-semibold text-slate-700">{title}</p>
      {children && <div className="text-sm text-slate-500">{children}</div>}
    </div>
  );
}

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  completed: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  incomplete: "bg-sky-100 text-sky-800 ring-sky-200",
  suspect: "bg-amber-100 text-amber-800 ring-amber-200",
  rejected: "bg-red-100 text-red-800 ring-red-200",
};

export function StatusBadge({ status }: { status: AttendanceStatus }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1", STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "brand" | "amber" | "emerald" | "red" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    brand: "bg-brand-50 text-brand-800 ring-brand-100",
    amber: "bg-amber-100 text-amber-800 ring-amber-200",
    emerald: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    red: "bg-red-100 text-red-800 ring-red-200",
  };
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1", tones[tone])}>
      {children}
    </span>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export { cx };
