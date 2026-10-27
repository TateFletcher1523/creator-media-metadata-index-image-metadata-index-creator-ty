import type { ImageFacts } from "./infrai_media_client.ts";

export type IndexedAsset = {
  key: string;
  width: number;
  height: number;
  format: string;
  orientation: "portrait" | "landscape" | "square";
  subscriberUpdate: "publish" | "hold";
};

export function decideCatalogEntry(key: string, facts: ImageFacts): IndexedAsset {
  const orientation = facts.width === facts.height
    ? "square"
    : facts.width > facts.height ? "landscape" : "portrait";
  const supportedFormat = ["jpeg", "jpg", "png", "webp"].includes(facts.format.toLowerCase());
  const subscriberUpdate = supportedFormat && facts.width >= 1200 && facts.height >= 1200
    ? "publish"
    : "hold";

  return {
    key,
    width: facts.width,
    height: facts.height,
    format: facts.format.toLowerCase(),
    orientation,
    subscriberUpdate,
  };
}
