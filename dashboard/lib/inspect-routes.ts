export const inspectRequestsHref = (subdomain: string) =>
  `/inspect/requests?subdomain=${encodeURIComponent(subdomain)}`;

export const inspectAnalyticsHref = (subdomain: string) =>
  `/inspect/analytics?subdomain=${encodeURIComponent(subdomain)}`;
