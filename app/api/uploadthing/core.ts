import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { cookies } from "next/headers";

const f = createUploadthing();

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Verifica la sesion reenviando la cookie al backend Express (unica fuente de verdad)
async function authenticate() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) {
    throw new UploadThingError("No autenticado");
  }
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { cookie: `token=${token}` },
  });
  if (!res.ok) {
    throw new UploadThingError("Sesion invalida");
  }
  const { user } = (await res.json()) as { user: { id: string } };
  return user;
}

// Router de archivos. Documentos del expediente: PDF e imagenes, hasta 8MB.
const onComplete = async ({
  metadata,
  file,
}: {
  metadata: { userId: string };
  file: { ufsUrl: string; key: string; name: string };
}) => ({
  uploadedBy: metadata.userId,
  url: file.ufsUrl,
  key: file.key,
  name: file.name,
});

export const ourFileRouter = {
  studentDocument: f({
    pdf: { maxFileSize: "8MB", maxFileCount: 1 },
    image: { maxFileSize: "8MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const user = await authenticate();
      return { userId: user.id };
    })
    .onUploadComplete(onComplete),

  // Diploma escaneado del egresado (PDF o imagen)
  graduateDiploma: f({
    pdf: { maxFileSize: "8MB", maxFileCount: 1 },
    image: { maxFileSize: "8MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const user = await authenticate();
      return { userId: user.id };
    })
    .onUploadComplete(onComplete),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
