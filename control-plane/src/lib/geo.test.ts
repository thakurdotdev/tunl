import { describe, expect, it } from "vitest";
import { lookupGeo } from "./geo.js";

describe("lookupGeo", () => {
  it("resolves public IPs to country and city", () => {
    const ro = lookupGeo("86.120.128.125");
    expect(ro.country).toBe("RO");
    expect(ro.city).toBe("Bucharest");

    const au = lookupGeo("113.29.242.148");
    expect(au.country).toBe("AU");
  });

  it("handles empty or private/localhost IPs gracefully", () => {
    expect(lookupGeo(undefined)).toEqual({ country: null, city: null });
    expect(lookupGeo("")).toEqual({ country: null, city: null });
    expect(lookupGeo("127.0.0.1")).toEqual({ country: null, city: null });
    expect(lookupGeo("192.168.1.1")).toEqual({ country: null, city: null });
    expect(lookupGeo("10.0.0.1:1234")).toEqual({ country: null, city: null });
  });

  it("handles IPs with ports and ::ffff: prefixes", () => {
    const res = lookupGeo("::ffff:86.120.128.125:44321");
    expect(res.country).toBe("RO");
    expect(res.city).toBe("Bucharest");
  });
});
