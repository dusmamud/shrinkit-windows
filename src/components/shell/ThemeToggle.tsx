import { Monitor, Moon, Sun } from "@phosphor-icons/react";
import { useTheme, type ThemeMode } from "../../lib/theme";

const ORDER: ThemeMode[] = ["light", "dark", "system"];

const META: Record<ThemeMode, { label: string; Icon: typeof Sun }> = {
  light: { label: "Light", Icon: Sun },
  dark: { label: "Dark", Icon: Moon },
  system: { label: "System", Icon: Monitor },
};

/** Cycles Light -> Dark -> System, mirroring the web app's theme control. */
export default function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const { label, Icon } = META[mode];
  const next = () => setMode(ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]);

  return (
    <button
      type="button"
      onClick={next}
      title={`Theme: ${label} (click to change)`}
      aria-label={`Theme: ${label}`}
      className="flex items-center gap-1.5 rounded-lg border border-[var(--t-border)] bg-[var(--t-surface)] px-2 py-1.5 text-xs font-medium text-[var(--t-ink-2)] outline-none hover:border-[var(--t-dash)]"
    >
      <Icon size={14} weight="bold" />
      {label}
    </button>
  );
}
