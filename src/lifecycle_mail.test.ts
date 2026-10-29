import test from "node:test";
import assert from "node:assert/strict";
import { selectLifecycleDecision, assetEventSchema } from "./lifecycle_mail.ts";

test("queued player assets stay out of lifecycle mail", () => {
  const event = assetEventSchema.parse({
    playerEmail: "player@example.com",
    playerName: "Mina",
    assetName: "Neon Kite",
    eventName: "Summer Arena",
    moderationState: "queued"
  });
  assert.equal(selectLifecycleDecision(event), "hold");
});
