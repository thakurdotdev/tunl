import axios, { AxiosError } from "axios";
import type { ApiError } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_CONTROL_PLANE_URL ?? "http://localhost:3001";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("tunl_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const status = error.response?.status ?? 500;
    const errorData = error.response?.data?.error ?? {
      code: "unknown",
      message: error.message || "Something went wrong",
      requestId: "",
    };
    return Promise.reject(new ApiClientError(status, errorData.code, errorData.message));
  },
);

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tunl_token");
}

export function setToken(token: string) {
  localStorage.setItem("tunl_token", token);
}

export function clearToken() {
  localStorage.removeItem("tunl_token");
}
