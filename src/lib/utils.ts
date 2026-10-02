export function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Deterministic, locale-independent timestamp for server-rendered markup.
 *
 * `Date#toLocaleString()` renders in the host's locale and timezone, so the
 * server emits UTC while the browser re-renders in local time during
 * hydration. The two strings differ, which React reports as a hydration
 * mismatch (error #418) and which forces it to discard the server HTML.
 * Formatting against an explicit UTC basis keeps both renders byte-identical.
 */
export function formatTimestampUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`;
}