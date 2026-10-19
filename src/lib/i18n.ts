import type { Locale } from "./locales";
import enMessages from "../i18n/messages/en.json";
import esMessages from "../i18n/messages/es.json";
import ptMessages from "../i18n/messages/pt.json";

export type MessageKey = keyof typeof enMessages;

const bundles: Record<Locale, Record<string, string>> = {
  en: enMessages as Record<string, string>,
  es: esMessages as Record<string, string>,
  pt: ptMessages as Record<string, string>,
};

/**
 * Translate a message key with an explicit locale.
 *
 * The web app compiles these same JSON catalogues through Paraglide; the
 * desktop app reads them directly (same `{param}` placeholder syntax) so the
 * catalogue stays a single source of truth across platforms. Missing keys
 * fall back to English, then to the key itself.
 */
export function t(
  locale: Locale,
  key: MessageKey,
  inputs: Record<string, string | number> = {},
): string {
  const template =
    bundles[locale]?.[key as string] ??
    (enMessages as Record<string, string>)[key as string] ??
    (key as string);
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in inputs ? String(inputs[name]) : match,
  );
}

const STORAGE_KEY = "shrinkit-locale";

/** Pick the initial locale: saved choice, else the OS language, else English. */
export function detectLocale(): Locale {
  const saved =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(STORAGE_KEY)
      : null;
  if (saved === "en" || saved === "es" || saved === "pt") return saved;
  const nav =
    typeof navigator !== "undefined" ? navigator.language.slice(0, 2) : "en";
  if (nav === "es" || nav === "pt") return nav;
  return "en";
}

export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Private mode etc. — the in-memory locale still works for the session.
  }
}
