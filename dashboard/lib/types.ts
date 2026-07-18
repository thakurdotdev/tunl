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

export type ApiError = {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
};
