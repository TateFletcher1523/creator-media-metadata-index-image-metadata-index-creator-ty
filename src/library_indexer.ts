import { decideCatalogEntry, type IndexedAsset } from "./catalog_decision.ts";
import { InfraiMediaClient } from "./infrai_media_client.ts";

export type DeliveryAsset = IndexedAsset & { downloadUrl?: string };

export async function indexCreatorLibrary(
  client: InfraiMediaClient,
  bucket: string,
  downloadTtlSeconds: number,
): Promise<DeliveryAsset[]> {
  const objects = await client.listObjects(bucket);
  const indexed: DeliveryAsset[] = [];

  for (const object of objects) {
    const head = await client.headObject(bucket, object.key);
    if (!head.found) continue;

    const source = await client.presignDownload(bucket, object.key, 300);
    const facts = await client.imageMetadata(source.url);
    const entry = decideCatalogEntry(object.key, facts);

    if (entry.subscriberUpdate === "publish") {
      const delivery = await client.presignDownload(bucket, object.key, downloadTtlSeconds);
      indexed.push({ ...entry, downloadUrl: delivery.url });
    } else {
      indexed.push(entry);
    }
  }
  return indexed;
}
