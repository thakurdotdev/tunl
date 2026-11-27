import { cn } from "@/lib/utils";

/** Shared title block for every signed-in page. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-[var(--hairline)] pb-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1.5 max-w-2xl text-sm leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Small "label: value" stat pill used in page headers. */
export function StatPill({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  tone?: "default" | "live";
}) {
  return (
    <div className="bg-card flex items-center gap-2 rounded-lg border border-[var(--hairline-strong)] px-3 py-1.5 text-xs shadow-2xs">
      <Icon className="text-muted-foreground/70 h-3.5 w-3.5" />
      <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
        {label}
      </span>
      <span
        className={cn(
          "flex items-center gap-1.5 font-semibold tabular-nums",
          tone === "live" ? "text-emerald-500 dark:text-emerald-400" : "text-foreground",
        )}
      >
        {tone === "live" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
        {value}
      </span>
    </div>
  );
}
