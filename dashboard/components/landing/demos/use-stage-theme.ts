"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** The site's theme for a Stage, with tunl's green tuned for each ground. */
export function useStageTheme() {
  const { resolvedTheme } = useTheme();
  // False on the server and during hydration, so the first client render matches
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const dark = mounted && resolvedTheme === "dark";
  return {
    theme: dark ? ("dark" as const) : ("light" as const),
    accent: dark ? "oklch(0.74 0.18 152)" : "oklch(0.55 0.19 152)",
  };
}
