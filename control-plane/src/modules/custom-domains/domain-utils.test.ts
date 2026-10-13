import { describe, expect, it } from "vitest";
import {
  dnsInstructions,
  isBaseDomainOrSubdomain,
  normalizeDomain,
  splitZone,
} from "./domain-utils.js";

describe("normalizeDomain", () => {
  it("lowercases and strips trailing dot", () => {
    expect(normalizeDomain("App.Example.COM.")).toBe("app.example.com");
  });

  it("rejects ips, bare tlds, and bad labels", () => {
    expect(() => normalizeDomain("1.2.3.4")).toThrow();
    expect(() => normalizeDomain("localhost")).toThrow();
    expect(() => normalizeDomain("-bad.example.com")).toThrow();
    expect(() => normalizeDomain("a..example.com")).toThrow();
  });

  it("rejects empty and overlong domains", () => {
    expect(() => normalizeDomain("   ")).toThrow();
    expect(() => normalizeDomain(`${"a".repeat(64)}.com`)).toThrow();
  });
});

describe("isBaseDomainOrSubdomain", () => {
  it("matches base and subdomains only", () => {
    expect(isBaseDomainOrSubdomain("tunl.online", "tunl.online")).toBe(true);
    expect(isBaseDomainOrSubdomain("app.tunl.online", "tunl.online")).toBe(true);
    expect(isBaseDomainOrSubdomain("app.example.com", "tunl.online")).toBe(false);
    expect(isBaseDomainOrSubdomain("eviltunl.online", "tunl.online")).toBe(false);
  });
});

describe("splitZone", () => {
  it("splits subdomains into zone + relative host", () => {
    expect(splitZone("hello.thakur.dev")).toEqual({ zone: "thakur.dev", relativeHost: "hello" });
    expect(splitZone("a.b.example.com")).toEqual({ zone: "example.com", relativeHost: "a.b" });
  });

  it("handles apex domains and multi-part public suffixes", () => {
    expect(splitZone("thakur.dev")).toEqual({ zone: "thakur.dev", relativeHost: "" });
    expect(splitZone("app.example.co.uk")).toEqual({
      zone: "example.co.uk",
      relativeHost: "app",
    });
  });
});

describe("dnsInstructions", () => {
  it("emits zone-relative names for subdomains", () => {
    const dns = dnsInstructions("hello.thakur.dev", "tok123", "tunl.online");
    expect(dns.zone).toBe("thakur.dev");
    expect(dns.cname).toEqual({
      type: "CNAME",
      name: "hello",
      fullName: "hello.thakur.dev",
      value: "cname.tunl.online",
    });
    expect(dns.txt).toEqual({
      type: "TXT",
      name: "_tunl-challenge.hello",
      fullName: "_tunl-challenge.hello.thakur.dev",
      value: "tok123",
    });
  });

  it("uses @ for apex CNAMEs", () => {
    const dns = dnsInstructions("example.com", "tok123", "tunl.online");
    expect(dns.cname.name).toBe("@");
    expect(dns.txt.name).toBe("_tunl-challenge");
  });
});
