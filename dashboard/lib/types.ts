export type User = {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  image?: string | null;
  role?: "user" | "admin";
  planId?: string | null;
  plan?: {
    name: string;
    maxReservedSubdomains: number;
  };
  twoFactorEnabled?: boolean;
  ipWhitelistEnabled?: boolean;
  allowedIps?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type ActiveSessionItem = {
  id: string;
  subdomain: string;
  remoteIp: string;
  country?: string | null;
  city?: string | null;
  connectedAt: string;
  userEmail: string | null;
};

export type PaginationMetadata = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  pagination: PaginationMetadata;
};

export type TunnelEventItem = {
  id: string;
  eventId?: string;
  eventType: string;
  subdomain: string | null;
  remoteIp: string | null;
  country?: string | null;
  city?: string | null;
  anonymousId?: string | null;
  occurredAt: string;
  userEmail: string | null;
  properties?: Record<string, any>;
};

export type AdminAuditQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  eventType?: "all" | "tunnel.connected" | "tunnel.disconnected";
};

export type AdminUsersQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: "all" | "admin" | "user";
  planId?: string;
  sortBy?: "createdAt" | "email";
  sortOrder?: "asc" | "desc";
};

export type AdminUsersResponse = {
  users: AdminUser[];
  pagination: PaginationMetadata;
};

export type AdminAnalytics = {
  totalUsers: number;
  totalActiveSessions: number;
  totalTunnels: number;
  totalCustomDomains: number;
  activeTunnelsLast30d?: number;
  totalEvents: number;
  totalLinkedIdentities?: number;
  totalAuthEvents?: number;
  totalAnonEvents?: number;
  planDistribution: Array<{
    planName: string;
    userCount: number;
    maxSubdomains?: number;
    maxActiveTunnels?: number;
  }>;
  eventTypeCounts?: Array<{
    eventType: string;
    eventCount: number;
  }>;
  activeSessionsList: ActiveSessionItem[];
  recentEventsList: TunnelEventItem[];
};

export type AdminOverviewAnalytics = Pick<
  AdminAnalytics,
  | "totalUsers"
  | "totalActiveSessions"
  | "totalTunnels"
  | "totalCustomDomains"
  | "totalEvents"
  | "planDistribution"
> & {
  activeTunnelsLast30d?: number;
};

export type AdminEngagementAnalytics = {
  newUsersLast24h: number;
  newUsersLast7d: number;
  newUsersLast30d: number;
  dauCount: number;
  wauCount: number;
  mauCount: number;
  totalConversions: number;
  totalLinkedIdentities: number;
  uniqueAnonymousDevices: number;
  conversionRate: number;
  recentConversions: Array<{
    anonymousId: string;
    userId: string;
    userEmail: string;
    linkedAt: string;
  }>;
};

export type AdminSessionAnalytics = {
  totalActiveSessions: number;
  totalAuthEvents: number;
  totalAnonEvents: number;
  avgSessionDurationMs: number | null;
  medianSessionDurationMs: number | null;
  completedSessions: number;
  peakConcurrentTunnelsLast24h: number;
  activeSessionsList: ActiveSessionItem[];
  recentEventsList: TunnelEventItem[];
};

export type AdminGrowthAnalytics = {
  days: Array<{ day: string; signups: number }>;
};

export type AdminGeoAnalytics = {
  uniqueIpsLast24h: number;
  countries: Array<{ country: string; sessionCount: number; uniqueDevices: number }>;
};

export type BandwidthSummary = {
  totalRequests: number;
  totalBytesIn: number;
  totalBytesOut: number;
  totalBandwidth: number;
  totalErrors: number;
  avgDurationMs: number;
  errorRate: number;
  successRate: number;
};

export type BandwidthTimeSeriesBucket = {
  bucketStart: string;
  requestCount: number;
  bytesIn: number;
  bytesOut: number;
  errorCount: number;
  avgDurationMs: number;
  errorRate: number;
};

export type TopBandwidthSubdomain = {
  subdomain: string;
  requestCount: number;
  bytesIn: number;
  bytesOut: number;
  totalBytes: number;
};

export type AdminBandwidthAnalytics = {
  period: "24h" | "7d" | "30d";
  summary: BandwidthSummary;
  timeSeries: BandwidthTimeSeriesBucket[];
  topSubdomains: TopBandwidthSubdomain[];
};

export type AdminUser = {
  id: string;
  email: string;
  name?: string | null;
  role: "user" | "admin";
  planName: string;
  planId: string;
  createdAt: string;
  sshKeyCount: number;
  reservedSubdomains: string[];
  customDomains: Array<{ domain: string; status: "pending" | "verified" | "failed" }>;
};

export type AdminPlan = {
  id: string;
  name: string;
  maxReservedSubdomains: number;
  maxActiveTunnels: number;
  maxCustomDomains?: number;
  isDefault: boolean;
  createdAt: string;
};

export type SSHKey = {
  id: string;
  fingerprint: string;
  label: string;
  createdAt: string;
};

export type Tunnel = {
  id: string;
  subdomain: string;
  status: "reserved" | "active" | "inactive";
  password?: string | null;
  hasPassword?: boolean;
  lastConnectedAt: string | null;
  createdAt: string;
};

export type CustomDomainDnsRecord = {
  type: string;
  /** Short name relative to the zone, e.g. "hello" or "_tunl-challenge.hello" */
  name: string;
  /** Full hostname for providers that want FQDNs, e.g. "hello.thakur.dev" */
  fullName: string;
  value: string;
};

export type CustomDomainDns = {
  zone: string;
  cname: CustomDomainDnsRecord;
  txt: CustomDomainDnsRecord;
};

export type CustomDomain = {
  id: string;
  domain: string;
  tunnelId: string;
  subdomain: string;
  status: "pending" | "verified" | "failed";
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  dns: CustomDomainDns;
};

export type VerifyCustomDomainResult = {
  id: string;
  domain: string;
  status: "pending" | "verified" | "failed";
  verified: boolean;
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  detail: string;
  dns: CustomDomainDns;
};

export type TunnelSession = {
  id: string;
  tunnelId: string | null;
  subdomain: string;
  remoteIp: string;
  connectedAt: string;
  lastSeenAt: string;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
};

export type CapturedRequest = {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  requestSize: number;
  responseSize: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  clientIP: string;
};

export type ReplayResult = {
  success: boolean;
  statusCode: number;
  durationMs: number;
  responseHeaders: Record<string, string>;
  responseBody: string;
};

export type BandwidthBucket = {
  bucketStart: string;
  requestCount: number;
  bytesIn: number;
  bytesOut: number;
  errorCount: number;
  avgDurationMs: number;
  errorRate: number;
};

export type SubdomainAnalytics = {
  subdomain: string;
  period: "24h" | "7d" | "30d";
  summary: {
    totalRequests: number;
    totalBytesIn: number;
    totalBytesOut: number;
    totalErrors: number;
    avgDurationMs: number;
    errorRate: number;
  };
  timeSeries: BandwidthBucket[];
};
