import { z } from "zod";
import { clientFromEnvironment } from "./infrai_media_client.ts";
import { indexCreatorLibrary } from "./library_indexer.ts";

const optionsSchema = z.object({
  bucket: z.string().min(3),
  downloadTtlSeconds: z.coerce.number().int().min(60).max(86_400).default(900),
});

const options = optionsSchema.parse({
  bucket: process.env.MEDIA_BUCKET ?? "creator-media-demo",
  downloadTtlSeconds: process.env.DOWNLOAD_TTL_SECONDS,
});
const client = clientFromEnvironment();

await client.createBucket(options.bucket);
const assets = await indexCreatorLibrary(client, options.bucket, options.downloadTtlSeconds);
console.log(JSON.stringify({ bucket: options.bucket, assets }, null, 2));
