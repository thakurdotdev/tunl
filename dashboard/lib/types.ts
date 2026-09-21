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
};

export type AdminPlan = {
  id: string;
  name: string;
  maxReservedSubdomains: number;
  maxActiveTunnels: number;
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
