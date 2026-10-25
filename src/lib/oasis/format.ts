export function formatOasisTimestamp(value: unknown, fallback = "—") {
  return formatOasisTimestampInTimeZone(value, fallback);
}

export function formatOasisTimestampInTimeZone(value: unknown, fallback = "—", timeZone?: string) {
  if (value === undefined || value === null || String(value).trim() === "") return fallback;

  const text = String(value).trim();
  // Oasis timestamps are UTC when the API omits an explicit offset.
  const parseableText = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text) ? text : `${text}Z`;
  const date = new Date(parseableText);

  if (!Number.isNaN(date.getTime())) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      ...(timeZone ? { timeZone } : {}),
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
  }

  return text
    .replace(/\.\d+(?=(Z|[+-]\d{2}:?\d{2})?$)/, "")
    .replace("T", " ")
    .replace(/Z$/, "");
}
