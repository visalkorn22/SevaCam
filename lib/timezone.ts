const ISO_DATETIME_WITHOUT_TIMEZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

function toDate(value: string | Date): Date | null {
  const normalizedValue =
    value instanceof Date
      ? value
      : ISO_DATETIME_WITHOUT_TIMEZONE.test(value)
        ? `${value}Z`
        : value;
  const date =
    normalizedValue instanceof Date
      ? normalizedValue
      : new Date(normalizedValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseDateValue(value: string | Date): Date | null {
  return toDate(value);
}

function fallbackDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTimeZoneOffsetMilliseconds(
  date: Date,
  timeZone?: string | null,
): number {
  if (!timeZone) {
    return -date.getTimezoneOffset() * 60_000;
  }

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);

    const year = Number(parts.find((part) => part.type === "year")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    const day = Number(parts.find((part) => part.type === "day")?.value);
    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    const minute = Number(
      parts.find((part) => part.type === "minute")?.value,
    );
    const second = Number(
      parts.find((part) => part.type === "second")?.value,
    );

    const utcTimestamp = Date.UTC(year, month - 1, day, hour, minute, second);
    return utcTimestamp - date.getTime();
  } catch {
    return -date.getTimezoneOffset() * 60_000;
  }
}

export function formatInTimeZone(
  value: string | Date,
  options: Intl.DateTimeFormatOptions,
  timeZone?: string | null,
): string {
  const date = toDate(value);
  if (!date) return "";

  try {
    return new Intl.DateTimeFormat("en-US", {
      ...options,
      ...(timeZone ? { timeZone } : {}),
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", options).format(date);
  }
}

export function formatDateInTimeZone(
  value: string | Date,
  timeZone?: string | null,
): string {
  return formatInTimeZone(
    value,
    { month: "short", day: "numeric", year: "numeric" },
    timeZone,
  );
}

export function formatLongDateInTimeZone(
  value: string | Date,
  timeZone?: string | null,
): string {
  return formatInTimeZone(
    value,
    { weekday: "long", month: "long", day: "numeric", year: "numeric" },
    timeZone,
  );
}

export function formatTimeInTimeZone(
  value: string | Date,
  timeZone?: string | null,
): string {
  return formatInTimeZone(
    value,
    { hour: "numeric", minute: "2-digit", hour12: true },
    timeZone,
  );
}

export function formatDateTimeInTimeZone(
  value: string | Date,
  timeZone?: string | null,
): string {
  return formatInTimeZone(
    value,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    },
    timeZone,
  );
}

export function formatDateInputInTimeZone(
  value: string | Date,
  timeZone?: string | null,
): string {
  const date = toDate(value);
  if (!date) return "";

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      ...(timeZone ? { timeZone } : {}),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);

    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    return fallbackDateInput(date);
  }

  return fallbackDateInput(date);
}

export function getHourInTimeZone(
  value: string | Date,
  timeZone?: string | null,
): number {
  const date = toDate(value);
  if (!date) return 0;

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      ...(timeZone ? { timeZone } : {}),
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const hour = parts.find((part) => part.type === "hour")?.value;
    return hour ? Number(hour) : 0;
  } catch {
    return date.getHours();
  }
}

export function dateTimeLocalToUtcIsoString(
  value: string,
  timeZone?: string | null,
): string {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);

  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? "" : fallback.toISOString();
  }

  const [, year, month, day, hour, minute, second = "00"] = match;
  const utcGuess = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ),
  );

  const initialOffset = getTimeZoneOffsetMilliseconds(utcGuess, timeZone);
  let resolved = new Date(utcGuess.getTime() - initialOffset);
  const correctedOffset = getTimeZoneOffsetMilliseconds(resolved, timeZone);

  if (correctedOffset !== initialOffset) {
    resolved = new Date(utcGuess.getTime() - correctedOffset);
  }

  return resolved.toISOString();
}
