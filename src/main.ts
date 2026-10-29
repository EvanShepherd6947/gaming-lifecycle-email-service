import { processAssetEvent } from "./lifecycle_mail.ts";

const input = process.env.ASSET_EVENT_JSON;
if (!input) {
  console.error("Set ASSET_EVENT_JSON to a JSON asset event.");
  process.exitCode = 1;
} else {
  const result = await processAssetEvent(JSON.parse(input));
  console.log(JSON.stringify(result));
}
