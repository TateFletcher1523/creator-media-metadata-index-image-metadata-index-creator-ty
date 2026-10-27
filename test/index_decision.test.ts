import assert from "node:assert/strict";
import test from "node:test";
import { decideCatalogEntry } from "../src/catalog_decision.ts";

test("publishes a large portrait JPEG from metadata rather than its misleading filename", () => {
  const entry = decideCatalogEntry("exports/square-avatar.png", {
    width: 1600,
    height: 2400,
    format: "JPEG",
  });

  assert.deepEqual(entry, {
    key: "exports/square-avatar.png",
    width: 1600,
    height: 2400,
    format: "jpeg",
    orientation: "portrait",
    subscriberUpdate: "publish",
  });
});

test("holds a small image out of subscriber updates", () => {
  const entry = decideCatalogEntry("originals/launch.webp", {
    width: 900,
    height: 900,
    format: "webp",
  });

  assert.equal(entry.orientation, "square");
  assert.equal(entry.subscriberUpdate, "hold");
});
