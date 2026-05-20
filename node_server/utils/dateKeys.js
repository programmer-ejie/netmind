const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Manila";

const dateFormatterCache = new Map();

function getDateFormatter(timeZone = APP_TIME_ZONE) {
  if (!dateFormatterCache.has(timeZone)) {
    dateFormatterCache.set(timeZone, new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }));
  }

  return dateFormatterCache.get(timeZone);
}

function toLocalDateKey(value = new Date(), timeZone = APP_TIME_ZONE) {
  if (value === null || value === "") return "";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return value ? String(value).slice(0, 10) : "";

  const parts = getDateFormatter(timeZone).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${byType.year}-${byType.month}-${byType.day}`;
}

module.exports = {
  APP_TIME_ZONE,
  toLocalDateKey,
};
