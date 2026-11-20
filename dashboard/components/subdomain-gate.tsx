"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, type ReactNode } from "react";

type Render = (subdomain: string) => ReactNode;

function SubdomainFromQuery({ children }: { children: Render }) {
  const subdomain = useSearchParams().get("subdomain")?.trim() ?? "";
  const router = useRouter();

  useEffect(() => {
    if (!subdomain) router.replace("/inspect");
  }, [subdomain, router]);

  return subdomain ? children(subdomain) : null;
}

/**
 * Reads `?subdomain=` for the inspector pages. Static export can't prerender a
 * `[subdomain]` segment for user-created tunnels, so the value lives in the query.
 */
export function SubdomainGate({ children }: { children: Render }) {
  return (
    <Suspense fallback={null}>
      <SubdomainFromQuery>{children}</SubdomainFromQuery>
    </Suspense>
  );
}
