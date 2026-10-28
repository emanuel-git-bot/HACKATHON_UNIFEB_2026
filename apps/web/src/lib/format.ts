import type { AttendanceStatus, CheckinMode } from "./types";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const weekdayFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" });

export const formatDate = (ms: number) => dateFmt.format(ms);
export const formatTime = (ms: number) => timeFmt.format(ms);
export const formatDateTime = (ms: number) => `${dateFmt.format(ms)} às ${timeFmt.format(ms)}`;
export const formatShortDay = (ms: number) => weekdayFmt.format(ms).replace(".", "");
export function formatRange(start: number, end: number): string {
  const sameDay = new Date(start).toDateString() === new Date(end).toDateString();
  return sameDay
    ? `${formatShortDay(start)} · ${formatTime(start)}–${formatTime(end)}`
    : `${formatShortDay(start)} ${formatTime(start)} até ${formatShortDay(end)} ${formatTime(end)}`;
}

export function formatHours(hours: number): string {
  const value = Number.isInteger(hours) ? String(hours) : hours.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${value}h`;
}

/** Converte epoch ms para o valor de um <input type="datetime-local"> no fuso do navegador. */
export function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): number {
  return new Date(value).getTime();
}

export const MODE_LABELS: Record<CheckinMode, { title: string; description: string }> = {
  entry: { title: "Só QR de entrada", description: "Uma leitura no início já confirma a presença." },
  exit: { title: "Só QR de saída", description: "Um QR único no final do evento." },
  entry_exit: { title: "QR de entrada + QR de saída", description: "Garante que o aluno ficou até o fim." },
  entry_keyword: {
    title: "QR de entrada + palavra-chave",
    description: "No final, o palestrante fala uma palavra e o aluno digita no app.",
  },
};

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  completed: "Presença confirmada",
  incomplete: "Incompleta",
  suspect: "Aguardando conferência",
  rejected: "Recusada",
};

export const CATEGORY_LABELS: Record<string, string> = {
  palestra: "Palestra",
  outro: "Outro",
};

/** Motivos registrados no histórico de tentativas. */
export const ATTEMPT_REASONS: Record<string, string> = {
  ok_ip: "Confirmado pela rede da faculdade",
  ok_gps: "Confirmado pelo GPS",
  keyword_ok: "Palavra-chave correta",
  manual: "Lançamento manual",
  qr_expired: "QR Code expirado (foto/print antigo)",
  qr_invalid: "QR Code inválido ou adulterado",
  phase_closed: "Etapa fechada",
  device_reused: "Aparelho já usado por outra conta",
  ticket_used: "Leitura reutilizada",
  ticket_expired: "Tempo para concluir esgotado",
  attendance_rejected: "Presença já recusada",
  keyword_wrong: "Palavra-chave incorreta",
  out_of_range: "Fora do raio do evento",
  low_accuracy: "GPS impreciso",
  gps_unavailable: "GPS indisponível ou negado",
  event_without_location: "Evento sem local definido",
};
