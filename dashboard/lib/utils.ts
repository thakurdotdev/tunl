import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

/** Convert an ISO country code (e.g. "US") to its full name (e.g. "United States"). */
export function countryName(code: string | null | undefined): string | null {
  if (!code) return null;
  try {
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** Get a flag image URL for an ISO country code via flagcdn.com. */
export function countryFlagUrl(code: string | null | undefined, size: 16 | 20 | 24 | 32 | 48 = 20): string | null {
  if (!code) return null;
  return `https://flagcdn.com/${size}x${Math.round(size * 0.75)}/${code.toLowerCase()}.png`;
}
