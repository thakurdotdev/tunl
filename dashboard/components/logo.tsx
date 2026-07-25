import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 font-bold tracking-tight text-sm select-none",
        className,
      )}
    >
      <span className="text-primary font-mono font-semibold">{">_"}</span>
      <span className="text-foreground font-sans font-bold tracking-tight text-base">tunl</span>
      <span className="bg-primary/90 animate-terminal-blink inline-block h-3.5 w-1.5 rounded-2xs" />
    </div>
  );
}
