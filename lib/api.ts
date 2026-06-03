// Cliente HTTP minimalista para hablar con el backend Express.
// Usa credentials:'include' para enviar la cookie httpOnly de sesion.

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type Options = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
};

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "include",
    signal: opts.signal,
  });

  const isJson = res.headers
    .get("content-type")
    ?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const message =
      (data && (data.error as string)) || `Error ${res.status}`;
    throw new ApiError(res.status, message, data?.details);
  }

  return data as T;
}

export const apiUrl = API_URL;
