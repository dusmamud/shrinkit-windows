import { useState } from "react";
import {
  ArrowsLeftRight,
  Crop,
  DownloadSimple,
  IdentificationCard,
  ShareNetwork,
} from "@phosphor-icons/react";
import ShrinkItApp from "./components/react/ShrinkItApp";
import ComparisonSliderApp from "./tools/compare/ComparisonSliderApp";
import PassportPhotoApp from "./tools/passport/PassportPhotoApp";
import SocialResizerApp from "./tools/social/SocialResizerApp";
import TargetSizeApp from "./tools/target-size/TargetSizeApp";
import { detectLocale, saveLocale, t } from "./lib/i18n";
import type { Locale } from "./lib/locales";
import LanguageMenu from "./components/shell/LanguageMenu";
import ThemeToggle from "./components/shell/ThemeToggle";

type ToolId = "resize" | "size50" | "size20" | "passport" | "social" | "compare";

/**
 * Desktop shell: no landing page, no marketing sections — the app opens
 * straight into the resizer and the sidebar switches between the six tools.
 * Tool UI and the image engine are reused verbatim from the web app.
 */
export default function App() {
  const [tool, setTool] = useState<ToolId>("resize");
  const [locale, setLocale] = useState<Locale>(() => detectLocale());

  const changeLocale = (next: Locale) => {
    setLocale(next);
    saveLocale(next);
  };

  const nav: { id: ToolId; label: string; Icon: typeof Crop }[] = [
    { id: "resize", label: t(locale, "hero.title"), Icon: Crop },
    { id: "size50", label: t(locale, "footer.tools_50kb"), Icon: DownloadSimple },
    { id: "size20", label: t(locale, "footer.tools_20kb"), Icon: DownloadSimple },
    { id: "passport", label: t(locale, "footer.tools_passport"), Icon: IdentificationCard },
    { id: "social", label: t(locale, "footer.tools_social"), Icon: ShareNetwork },
    { id: "compare", label: t(locale, "footer.tools_compare"), Icon: ArrowsLeftRight },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--t-page)] font-sans text-[var(--t-ink)]">
      {/* Sidebar: icon rail on narrow windows, full labels on wide windows */}
      <aside className="flex w-16 shrink-0 flex-col border-r border-[var(--t-border)] bg-[var(--t-band)] lg:w-60">
        <div className="flex items-center gap-2.5 px-3 pb-4 pt-5 lg:px-4">
          <img src="/icons/icon-192.png" alt="ShrinkIt" className="h-9 w-9 shrink-0" />
          <div className="hidden lg:block">
            <p className="text-base font-bold leading-tight text-[var(--t-ink)]">
              ShrinkIt
            </p>
            <p className="text-[11px] leading-tight text-[var(--t-muted)]">
              {t(locale, "footer.tools_all")}
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 lg:px-3">
          {nav.map(({ id, label, Icon }) => {
            const active = tool === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTool(id)}
                title={label}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors lg:justify-start justify-center ${
                  active
                    ? "bg-[var(--color-brand)] text-white"
                    : "text-[var(--t-ink-2)] hover:bg-[var(--t-surface-2)]"
                }`}
              >
                <Icon size={20} weight={active ? "fill" : "regular"} className="shrink-0" />
                <span className="hidden leading-snug lg:inline">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex flex-col items-center gap-2 border-t border-[var(--t-border)] px-2 py-3 lg:flex-row lg:px-4">
          <LanguageMenu locale={locale} onChange={changeLocale} />
          <ThemeToggle />
        </div>
      </aside>

      {/* Tool area */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-6 py-6">
          {tool === "resize" && <ShrinkItApp locale={locale} />}
          {tool === "size50" && (
            <TargetSizeApp
              initialTargetKb={50}
              title={t(locale, "footer.tools_50kb")}
            />
          )}
          {tool === "size20" && (
            <TargetSizeApp
              initialTargetKb={20}
              title={t(locale, "footer.tools_20kb")}
              enableBlackWhite
            />
          )}
          {tool === "passport" && <PassportPhotoApp />}
          {tool === "social" && <SocialResizerApp />}
          {tool === "compare" && <ComparisonSliderApp />}
        </div>
      </main>
    </div>
  );
}
