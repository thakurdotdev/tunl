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

export type TunnelEventItem = {
  id: string;
  eventType: string;
  subdomain: string | null;
  remoteIp: string | null;
  occurredAt: string;
  userEmail: string | null;
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

export type AdminUser = {
  id: string;
  email: string;
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
