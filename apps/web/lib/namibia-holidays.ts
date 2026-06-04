// Namibia Public Holidays
// Source: Government of Namibia Official Gazette

export interface PublicHoliday {
  date: string; // YYYY-MM-DD format
  name: string;
  type: "fixed" | "movable";
}

export const namibiaPublicHolidays2026: PublicHoliday[] = [
  { date: "2026-01-01", name: "New Year's Day", type: "fixed" },
  { date: "2026-03-21", name: "Independence Day", type: "fixed" },
  { date: "2026-04-03", name: "Good Friday", type: "movable" },
  { date: "2026-04-06", name: "Easter Monday", type: "movable" },
  { date: "2026-05-01", name: "Workers' Day", type: "fixed" },
  { date: "2026-05-04", name: "Cassinga Day", type: "fixed" },
  { date: "2026-05-14", name: "Ascension Day", type: "movable" },
  { date: "2026-05-25", name: "Africa Day", type: "fixed" },
  { date: "2026-08-26", name: "Heroes' Day", type: "fixed" },
  { date: "2026-12-10", name: "International Human Rights Day", type: "fixed" },
  { date: "2026-12-25", name: "Christmas Day", type: "fixed" },
  { date: "2026-12-26", name: "Family Day", type: "fixed" },
];

export const namibiaPublicHolidays2025: PublicHoliday[] = [
  { date: "2025-01-01", name: "New Year's Day", type: "fixed" },
  { date: "2025-03-21", name: "Independence Day", type: "fixed" },
  { date: "2025-04-18", name: "Good Friday", type: "movable" },
  { date: "2025-04-21", name: "Easter Monday", type: "movable" },
  { date: "2025-05-01", name: "Workers' Day", type: "fixed" },
  { date: "2025-05-04", name: "Cassinga Day", type: "fixed" },
  { date: "2025-05-29", name: "Ascension Day", type: "movable" },
  { date: "2025-05-25", name: "Africa Day", type: "fixed" },
  { date: "2025-08-26", name: "Heroes' Day", type: "fixed" },
  { date: "2025-12-10", name: "International Human Rights Day", type: "fixed" },
  { date: "2025-12-25", name: "Christmas Day", type: "fixed" },
  { date: "2025-12-26", name: "Family Day", type: "fixed" },
];

export function getAllHolidays(): PublicHoliday[] {
  return [...namibiaPublicHolidays2025, ...namibiaPublicHolidays2026];
}

export function getHolidayByDate(date: Date): PublicHoliday | undefined {
  const dateStr = date.toISOString().split("T")[0];
  return getAllHolidays().find((holiday) => holiday.date === dateStr);
}

export function isPublicHoliday(date: Date): boolean {
  return getHolidayByDate(date) !== undefined;
}

export function getUpcomingHolidays(count: number = 3): PublicHoliday[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return getAllHolidays()
    .filter((holiday) => new Date(holiday.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, count);
}
