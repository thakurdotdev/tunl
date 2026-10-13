import geoip from "geoip-lite";

export interface GeoLocation {
  country: string | null; // e.g. "US", "RO", "IN"
  city: string | null; // e.g. "Bucharest", "New Delhi"
  region?: string | null;
  timezone?: string | null;
}

/**
 * Resolves an IP address to country and city using geoip-lite.
 * Works completely offline in-memory, returning nulls for private/loopback IPs.
 */
export function lookupGeo(ip: string | undefined | null): GeoLocation {
  if (!ip) {
    return { country: null, city: null };
  }

  // Strip port (e.g. "1.2.3.4:5678") and IPv6-mapped IPv4 prefix ("::ffff:")
  const trimmed = ip.trim();
  const withoutPrefix = trimmed.startsWith("::ffff:") ? trimmed.slice(7) : trimmed;
  const cleanIp = withoutPrefix.split(":")[0];

  const geo = geoip.lookup(cleanIp);
  if (!geo) {
    return { country: null, city: null };
  }

  return {
    country: geo.country || null,
    city: geo.city || null,
    region: geo.region || null,
    timezone: geo.timezone || null,
  };
}
