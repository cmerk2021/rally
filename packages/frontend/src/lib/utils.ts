import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function truncate(text: string, max: number): string {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

export function classFor(status: string): string {
  switch (status) {
    case "running":
    case "online":
    case "active":
    case "completed":
    case "resolved":
      return "bg-green-500/15 text-green-500 border-green-500/30";
    case "in_progress":
    case "investigating":
    case "monitoring":
    case "scheduled":
      return "bg-blue-500/15 text-blue-500 border-blue-500/30";
    case "blocked":
    case "stopped":
    case "offline":
    case "critical":
      return "bg-red-500/15 text-red-500 border-red-500/30";
    case "degraded":
    case "paused":
    case "high":
    case "identified":
      return "bg-orange-500/15 text-orange-500 border-orange-500/30";
    case "todo":
    case "low":
    case "unknown":
      return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
    case "medium":
    case "maintenance":
      return "bg-yellow-500/15 text-yellow-500 border-yellow-500/30";
    case "archived":
    case "cancelled":
    case "ignored":
      return "bg-zinc-500/15 text-zinc-500 border-zinc-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function entityColor(type: string): string {
  switch (type) {
    case "project":
      return "hsl(var(--color-project))";
    case "task":
      return "hsl(var(--color-task))";
    case "change":
      return "hsl(var(--color-change))";
    case "service":
      return "hsl(var(--color-service))";
    case "asset":
      return "hsl(var(--color-asset))";
    case "incident":
      return "hsl(var(--color-incident))";
    case "doc":
    case "documentation":
      return "hsl(var(--color-doc))";
    case "decision":
      return "hsl(var(--color-decision))";
    case "maintenance":
      return "hsl(var(--color-maintenance))";
    default:
      return "hsl(var(--muted-foreground))";
  }
}
