import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely formats a Date object as 'YYYY-MM-DD' in local time.
 * Prevents UTC timezone boundary shifts (e.g. toISOString() shifting midnight back a day).
 */
export function toLocalDateString(d: Date): string {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Safely parses a 'YYYY-MM-DD' string to a Date object at 12:00:00 (noon) local time.
 * Prevents UTC midnight parsing bugs where negative/positive timezones shift by one day.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = clean.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }
  return new Date(dateStr);
}

export function formatDateArabic(dateStr: string): string {
  try {
    const date = parseLocalDate(dateStr);
    return new Intl.DateTimeFormat("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function formatShortDateArabic(dateStr: string): string {
  try {
    const date = parseLocalDate(dateStr);
    return new Intl.DateTimeFormat("ar-EG", {
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Normalizes Arabic string for resilient fuzzy matching:
 * - Normalizes Alef variations (أ, إ, آ, ٱ -> ا)
 * - Normalizes Taa Marbuta (ة -> ه)
 * - Normalizes Yaa (ى -> ي)
 * - Removes diacritics (tashkeel)
 * - Removes Tatweel / Kashida
 * - Trims and lowercases
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove tashkeel (fatha, damma, kasra, etc.)
    .replace(/\u0640/g, '') // Remove tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .toLowerCase()
    .trim();
}

/**
 * Trigger subtle haptic feedback on supported mobile devices
 */
export function triggerHaptic(type: 'light' | 'medium' | 'success' | 'warning' = 'light') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'light') navigator.vibrate(25);
      else if (type === 'medium') navigator.vibrate(45);
      else if (type === 'success') navigator.vibrate([30, 40, 30]);
      else if (type === 'warning') navigator.vibrate([60, 50, 60]);
    } catch (_) {}
  }
}
