import { ApiError, apiUrl } from "./api";

export interface UploadedFile {
  key: string;
  url: string;
  name: string;
  size: number;
}

// Sube un archivo al backend (multipart). El backend optimiza imagenes
// y devuelve { url, key }. La cookie de sesion va con credentials:include.
export async function uploadFile(file: File): Promise<UploadedFile> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${apiUrl}/api/uploads`, {
    method: "POST",
    body: form,
    credentials: "include",
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      (data && (data.error as string)) || `Error ${res.status}`
    );
  }
  return data as UploadedFile;
}
