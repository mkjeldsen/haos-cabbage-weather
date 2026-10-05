/**
 * Hidden holiday surprises. Deliberately undocumented in the editor and README.
 *
 * - halloween: 31 October
 * - christmas: 24–25 December
 * - nye:       31 December (fireworks once it's dark)
 * - newyear:   1 January, 00:00–00:59 (the big show)
 * - easter:    Maundy Thursday to Easter Monday (skærtorsdag → 2. påskedag)
 */
export type Holiday = 'halloween' | 'christmas' | 'nye' | 'newyear' | 'easter';

/** Easter Sunday for a Gregorian year (anonymous Gregorian algorithm), as a local date. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function holidayAt(now: Date): Holiday | null {
  const m = now.getMonth(), d = now.getDate();
  if (m === 9 && d === 31) return 'halloween';
  if (m === 11 && (d === 24 || d === 25)) return 'christmas';
  if (m === 11 && d === 31) return 'nye';
  if (m === 0 && d === 1 && now.getHours() === 0) return 'newyear';
  const easter = easterSunday(now.getFullYear());
  const today = new Date(now.getFullYear(), m, d).getTime();
  const day = 86400000;
  if (today >= easter.getTime() - 3 * day && today <= easter.getTime() + 1 * day) return 'easter';
  return null;
}
