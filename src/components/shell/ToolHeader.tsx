import type { ReactNode } from "react";

interface ToolHeaderProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Compact desktop-app tool header.
 *
 * The web pages these tools were ported from open with a giant centered
 * hero (pill badge + huge title + marketing paragraph) — in a desktop
 * window that wastes ~250px before any actual tool UI. This is the
 * app-style replacement: a small left-aligned title row with an icon tile
 * and a one-line description, consistent across all six tools.
 */
export default function ToolHeader({ icon, title, description, action }: ToolHeaderProps) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-taccent/10 text-taccent">
          {icon}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-tink">{title}</h1>
          {description ? (
            <p className="mt-0.5 line-clamp-2 text-sm text-tmuted">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
