import { createServer } from "node:http";
import { z } from "zod";
import { clientFromEnvironment, InfraiError } from "./infrai_media_client.ts";
import { indexCreatorLibrary } from "./library_indexer.ts";

const requestSchema = z.object({
  bucket: z.string().min(3).max(63).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
  downloadTtlSeconds: z.number().int().min(60).max(86_400).default(900),
});

const client = clientFromEnvironment();
const port = Number(process.env.PORT ?? 3000);

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/subscriber-updates") {
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Route not found" }));
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const parsed = requestSchema.safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (!parsed.success) {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Invalid request body", issues: parsed.error.issues }));
      return;
    }

    const assets = await indexCreatorLibrary(client, parsed.data.bucket, parsed.data.downloadTtlSeconds);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ bucket: parsed.data.bucket, assets }));
  } catch (error) {
    const status = error instanceof InfraiError && error.status >= 400 && error.status < 500
      ? error.status
      : 500;
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify({
      error: error instanceof InfraiError ? error.code : "SERVICE_ERROR",
      message: error instanceof Error ? error.message : "Unexpected error",
    }));
  }
});

server.listen(port, () => {
  console.log(`Creator media index listening on http://localhost:${port}`);
});
