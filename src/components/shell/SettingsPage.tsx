import {
  ArrowSquareOut,
  GearSix,
  Globe,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import ToolHeader from "./ToolHeader";
import { openExternal } from "../../lib/desktop";
import { t } from "../../lib/i18n";
import { locales, type Locale } from "../../lib/locales";
import { useTheme, type ThemeMode } from "../../lib/theme";
import pkg from "../../../package.json";

const PRIVACY_URL = "https://shrinkit.dusrel.com/privacy";
const TERMS_URL = "https://shrinkit.dusrel.com/terms";
const WEBSITE_URL = "https://shrinkit.dusrel.com";

const THEME_OPTIONS: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: "light", label: "Light", Icon: Sun },
  { mode: "dark", label: "Dark", Icon: Moon },
  { mode: "system", label: "System", Icon: Monitor },
];

const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
};

function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="w-full rounded-2xl border border-[var(--t-border)] bg-[var(--t-surface)] p-5 text-left shadow-[var(--t-shadow)]">
      <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--t-ink-3)]">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string; Icon?: typeof Sun }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-1 rounded-xl border border-[var(--t-border)] bg-[var(--t-bg-2)] p-1"
    >
      {options.map(({ value: v, label, Icon }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={v === value}
          className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
            v === value
              ? "bg-[var(--color-brand)] text-white shadow"
              : "text-[var(--t-ink-2)] hover:bg-[var(--t-surface)]"
          }`}
        >
          {Icon ? <Icon size={16} weight="bold" /> : null}
          {label}
        </button>
      ))}
    </div>
  );
}

function LinkRow({
  title,
  subtitle,
  url,
}: {
  title: string;
  subtitle?: string;
  url: string;
}) {
  return (
    <button
      type="button"
      onClick={() => void openExternal(url)}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-[var(--t-bg-2)]"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[var(--t-ink)]">
          {title}
        </span>
        {subtitle ? (
          <span className="block truncate text-xs text-[var(--t-ink-3)]">
            {subtitle}
          </span>
        ) : null}
      </span>
      <ArrowSquareOut
        size={16}
        weight="bold"
        className="shrink-0 text-[var(--t-ink-3)]"
      />
    </button>
  );
}

/**
 * Settings page — mirrors the Android app's Settings + About screens:
 * Appearance (theme), Language, and About (privacy / terms / website open
 * in the default browser). Every control here is wired to a real setting.
 */
export default function SettingsPage({
  locale,
  onLocaleChange,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}) {
  const { mode, setMode } = useTheme();

  return (
    <div className="flex w-full flex-col items-center">
      <ToolHeader
        icon={<GearSix size={22} weight="fill" />}
        title="Settings"
        description="Appearance, language and about this app."
      />

      <div className="flex w-full max-w-2xl flex-col gap-4">
        <Card title="Appearance">
          <p className="mb-2 text-sm font-semibold text-[var(--t-ink)]">
            Theme
          </p>
          <Segmented
            ariaLabel="Theme"
            value={mode}
            onChange={setMode}
            options={THEME_OPTIONS.map(({ mode: m, label, Icon }) => ({
              value: m,
              label,
              Icon,
            }))}
          />
        </Card>

        <Card title={t(locale, "nav.language")}>
          <Segmented
            ariaLabel={t(locale, "nav.language")}
            value={locale}
            onChange={onLocaleChange}
            options={locales.map((l) => ({
              value: l,
              label: LANGUAGE_NAMES[l],
            }))}
          />
        </Card>

        <Card title={t(locale, "about.title")}>
          <div className="flex flex-col items-center pb-2 pt-1 text-center">
            <img
              src="icons/icon-512.png"
              alt="ShrinkIt logo"
              className="h-16 w-16 rounded-2xl"
            />
            <p className="mt-3 text-lg font-bold text-[var(--t-ink)]">
              ShrinkIt
            </p>
            <p className="text-xs text-[var(--t-ink-3)]">
              Version {pkg.version}
            </p>
          </div>
          <div className="divide-y divide-[var(--t-border)]">
            <LinkRow
              title={t(locale, "footer.privacy_policy")}
              subtitle={PRIVACY_URL}
              url={PRIVACY_URL}
            />
            <LinkRow
              title={t(locale, "footer.terms")}
              subtitle={TERMS_URL}
              url={TERMS_URL}
            />
            <LinkRow
              title="Website"
              subtitle="shrinkit.dusrel.com"
              url={WEBSITE_URL}
            />
          </div>
        </Card>

        <p className="flex items-start justify-center gap-1.5 px-4 pb-2 text-center text-xs leading-relaxed text-[var(--t-ink-3)]">
          <ShieldCheck size={14} weight="bold" className="mt-0.5 shrink-0" />
          <span>
            100% private — every image is processed on this device. Nothing
            is uploaded, tracked or stored online.
          </span>
        </p>

        <p className="flex items-center justify-center gap-1.5 pb-2 text-xs text-[var(--t-ink-3)]">
          <Globe size={14} weight="bold" />
          ShrinkIt for Windows · by dusrel
        </p>
      </div>
    </div>
  );
}
