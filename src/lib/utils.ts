import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isTaskOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === "completed") return false;
  return dueDate < new Date().toISOString().slice(0, 10);
}
