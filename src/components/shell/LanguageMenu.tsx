import { locales, type Locale } from "../../lib/locales";

const LABELS: Record<Locale, string> = { en: "EN", es: "ES", pt: "PT" };

/**
 * Desktop language switcher. The web app uses a native <select> for the
 * same control, so the desktop app keeps that convention.
 */
export default function LanguageMenu({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
}) {
  return (
    <select
      value={locale}
      onChange={(e) => onChange(e.target.value as Locale)}
      aria-label="Language"
      className="cursor-pointer rounded-lg border border-[var(--t-border)] bg-[var(--t-surface)] px-2 py-1.5 text-xs font-medium text-[var(--t-ink-2)] outline-none hover:border-[var(--t-dash)]"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {LABELS[l]}
        </option>
      ))}
    </select>
  );
}
