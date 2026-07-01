import { getCollection, type CollectionEntry } from "astro:content";

export type ArrangementEvent = CollectionEntry<"arrangementer">;

export const TYPE_COLORS = {
  webinar:    { text: "#b42a46", tint: "#f7dfe4" },
  verksted:   { text: "#a2571c", tint: "#f6e7d5" },
  kurs:       { text: "#3b7357", tint: "#dcece3" },
  konferanse: { text: "#63478a", tint: "#e7dcf1" },
  internt:    { text: "#7a5b60", tint: "#ece0e1" },
} as const;

export const TYPE_LABELS = {
  webinar:    "Webinar",
  verksted:   "Verksted",
  kurs:       "Kurs",
  konferanse: "Konferanse",
  internt:    "Internt",
} as const;

export const MODE_LABELS = {
  digitalt: "Digitalt",
  oppmote:  "Oppmøte",
  hybrid:   "Hybrid",
} as const;

const isAbsoluteUrl = (value: string) =>
  /^(https?:)?\/\//.test(value) || value.startsWith("data:");

export const withBasePath = (base: string, path: string) => {
  if (isAbsoluteUrl(path)) return path;
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${path.replace(/^\//, "")}`;
};

export const getEventUrl = (base: string, event: ArrangementEvent) =>
  withBasePath(base, `arrangementer/${event.id}/`);

const osloFmt = (date: Date, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", ...opts }).format(date);

export const formatEventDayPadded = (date: Date) =>
  osloFmt(date, { day: "2-digit" }).replace(/\.$/, "");

export const formatEventMonthLong = (date: Date) =>
  osloFmt(date, { month: "long" });

export const formatEventMonthShort = (date: Date) =>
  osloFmt(date, { month: "short" }).replace(/\.$/, "");

export const formatEventYear = (date: Date) =>
  osloFmt(date, { year: "numeric" });

export const formatEventWeekdayShort = (date: Date) => {
  const raw = osloFmt(date, { weekday: "short" });
  return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/\.$/, "");
};

export const formatEventTime = (date: Date) =>
  osloFmt(date, { hour: "2-digit", minute: "2-digit" });

export const formatEventShortDate = (date: Date) => {
  const day = osloFmt(date, { day: "2-digit" }).replace(/\.$/, "");
  const month = osloFmt(date, { month: "short" }).replace(/\.$/, "");
  return `${day}. ${month}`;
};

export const formatEventLongDate = (date: Date) =>
  osloFmt(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export const getSpotsLabel = (event: ArrangementEvent): string => {
  if (event.data.status === "full") return "Fullbooket";
  if (event.data.capacity === null) return "Åpen for alle";
  const left = event.data.capacity - event.data.registeredCount;
  return `${left} av ${event.data.capacity} plasser igjen`;
};

export const generateIcsContent = (event: ArrangementEvent) => {
  const { title, startDateTime, endDateTime, locationName, ingress } = event.data;
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KI Hub//KITT//NO",
    "BEGIN:VEVENT",
    `DTSTART:${fmt(startDateTime)}`,
    `DTEND:${fmt(endDateTime)}`,
    `SUMMARY:${title.replace(/[,;\\]/g, (c) => `\\${c}`)}`,
    `DESCRIPTION:${ingress.replace(/[,;\\]/g, (c) => `\\${c}`).replace(/\n/g, "\\n")}`,
    `LOCATION:${locationName}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
};

export const generateIcsDataUrl = (event: ArrangementEvent) =>
  `data:text/calendar;charset=utf-8,${encodeURIComponent(generateIcsContent(event))}`;

export const isUpcomingEvent = (event: ArrangementEvent, now = new Date()) =>
  !event.data.draft &&
  event.data.status !== "cancelled" &&
  event.data.endDateTime >= now;

export const getUpcomingEvents = async (now = new Date()) => {
  const events = await getCollection("arrangementer");
  return events
    .filter((e) => isUpcomingEvent(e, now))
    .sort((a, b) => a.data.startDateTime.getTime() - b.data.startDateTime.getTime());
};
