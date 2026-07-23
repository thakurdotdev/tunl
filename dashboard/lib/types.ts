export type User = {
  id: string;
  email: string;
  emailVerified: boolean;
  plan: {
    name: string;
    maxReservedSubdomains: number;
  };
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
