export const SERVICE_TIME_ZONE = 'Africa/Cairo';
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SERVICE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});
const hourFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: SERVICE_TIME_ZONE, hour: 'numeric', hourCycle: 'h23',
});

export function serviceDate(date = new Date()): string {
  if (!Number.isFinite(date.getTime())) return '';
  const parts = dateFormatter.formatToParts(date);
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T12:00:00Z`)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

// Calendar arithmetic is intentionally independent of the browser timezone and DST.
export function addDays(value: string, days: number): string {
  if (!validDate(value)) throw new Error('تاريخ غير صالح');
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function dateDistance(later: string, earlier: string): number {
  return Math.round((Date.parse(`${later}T12:00:00Z`) - Date.parse(`${earlier}T12:00:00Z`)) / 86400000);
}

export function dayOfWeek(value: string): number {
  return new Date(`${value}T12:00:00Z`).getUTCDay();
}

export function precedingFriday(value = serviceDate(), includeToday = false): string {
  const distance = (dayOfWeek(value) + 2) % 7;
  return addDays(value, -(distance === 0 && !includeToday ? 7 : distance));
}

export function upcomingFriday(value = serviceDate()): string {
  return addDays(value, (5 - dayOfWeek(value) + 7) % 7);
}

export function serviceHour(date = new Date()): number {
  return Number(hourFormatter.format(date));
}

export function academicYearStart(value = serviceDate()): string {
  const year = Number(value.slice(0, 4)) - (Number(value.slice(5, 7)) < 9 ? 1 : 0);
  return `${year}-09-01`;
}
