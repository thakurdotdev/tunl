export type User = {
  id: string;
  email: string;
  emailVerified: boolean;
  role: "user" | "admin";
  plan: {
    name: string;
    maxReservedSubdomains: number;
  };
};

export type AdminAnalytics = {
  totalUsers: number;
  totalActiveSessions: number;
  totalTunnels: number;
  planDistribution: Array<{
    planName: string;
    userCount: number;
  }>;
};

export type AdminUser = {
  id: string;
  email: string;
  role: "user" | "admin";
  planName: string;
  planId: string;
  createdAt: string;
  sshKeyCount: number;
  reservedSubdomainsCount: number;
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
