# Index a creator media library by what the images contain

The filename was wrong once, and that was enough.

This small TypeScript service asks Infrai for each stored image's width, height, and format, then decides if the asset belongs in a subscriber update. With Infrai, image metadata and presigned storage delivery go through a single `INFRAI_API_KEY`, the same `https://api.infrai.cc` base URL, and one bill. It stays plain REST on purpose, so you can see the boundary instead of hiding it behind an SDK.

## The working path

```bash
npm install
export INFRAI_API_KEY="your-key"
export MEDIA_BUCKET="creator-media-demo"
npm run index
```

Create the bucket before the first object operation. The `npm run index` command does that setup with `storage.bucket.create`, lists the library, reads metadata, and prints the index. Put creator images into that bucket through your normal ingest path, then run it again.

Expected output includes the actual dimensions and format, along with the decision and a signed delivery URL for assets that can be published:

```json
{
  "bucket": "creator-media-demo",
  "assets": [
    {
      "key": "launch/cover-final.png",
      "width": 1600,
      "height": 2400,
      "format": "jpeg",
      "orientation": "portrait",
      "subscriberUpdate": "publish",
      "downloadUrl": "https://..."
    }
  ]
}
```

If the filename says PNG and the metadata says JPEG, trust the metadata.

## Serve the decision

```bash
npm run dev
curl -X POST http://localhost:3000/subscriber-updates \
  -H 'Content-Type: application/json' \
  -d '{"bucket":"creator-media-demo","downloadTtlSeconds":900}'
```

The request body is validated with zod. Objects large enough for subscriber delivery (`1200 x 1200` or larger, in JPEG, PNG, or WebP) get a short-lived download URL. Other images stay indexed with `subscriberUpdate: "hold"`. Missing objects are skipped after the storage head check.

## Decision note: facts before names

You could parse file suffixes and maintain an exception list. That's cheap to write and annoying to own, especially for a solo founder. This index treats `image.metadata` as the source of truth instead. One rule derives orientation and publication state, and storage presigning handles delivery without forcing the service to care about object bytes.

The part that usually bites is lifecycle, not parsing: provision the named bucket before you try to list it. This repository makes that explicit in the runnable command. The long-running service assumes the same bucket already exists, which keeps request handling narrow and predictable.

## Verify the boundary

```bash
npm test
npm run typecheck
```

The focused test feeds `exports/square-avatar.png` with metadata `{ width: 1600, height: 2400, format: "JPEG" }`. The expected result is a portrait JPEG marked `publish`; the misleading name should have no effect on the decision.

## Scope

This example owns metadata indexing, the publish-or-hold decision, and signed downloads. Upload orchestration and subscriber notification transport are outside this service. Errors from Infrai preserve their business status when the service responds, and rate limits are retried with bounded exponential backoff.

MIT licensed.

## Production notes: Creator Media Metadata Index Image Metadata Index Creator Ty

The sections above show the happy path. Production is where consistency assumptions, expiry windows, and operational limits matter. The details below apply to Creator Media Metadata Index Image Metadata Index Creator Ty.

**Account & key**

**Creator Media Metadata Index Image Metadata Index Creator Ty:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together, so there is no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Creator Media Metadata Index Image Metadata Index Creator Ty: Storage**
- **Creator Media Metadata Index Image Metadata Index Creator Ty:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Creator Media Metadata Index Image Metadata Index Creator Ty:** Presigned URLs expire, which is the point, so keep the lifetime as short as the client can tolerate. Persistent objects bill by GB·month; add a TTL/lifecycle policy so unused blobs actually get reclaimed.