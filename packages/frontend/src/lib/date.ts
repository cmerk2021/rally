import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  try {
    const d = parseISO(value);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

export function formatDate(value: string | Date | null | undefined, fmt = "yyyy-MM-dd"): string {
  const d = toDate(value);
  if (!d) return "";
  return format(d, fmt);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "";
  return format(d, "yyyy-MM-dd HH:mm");
}

export function relative(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "";
  return formatDistanceToNow(d, { addSuffix: true });
}

export function dayLabel(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "";
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMM d, yyyy");
}

export function durationBetween(start: string | Date | null, end: string | Date | null): string {
  const s = toDate(start);
  const e = toDate(end);
  if (!s || !e) return "";
  const ms = e.getTime() - s.getTime();
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
