import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Endpoint que UploadThing usa para negociar y completar las subidas.
// Lee UPLOADTHING_TOKEN del entorno automaticamente.
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
