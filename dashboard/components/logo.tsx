import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 font-mono font-bold tracking-tight text-base select-none",
        className,
      )}
    >
      <span className="text-primary font-bold">{">_"}</span>
      <span className="text-foreground tracking-wider">tunl</span>
      <span className="bg-primary/80 animate-terminal-blink inline-block h-3.5 w-1.5" />
    </div>
  );
}
