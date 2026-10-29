import { z } from "zod";
import { sendEmail } from "./infrai.ts";

export const assetEventSchema = z.object({
  playerEmail: z.string().email(),
  playerName: z.string().min(1),
  assetName: z.string().min(1),
  eventName: z.string().min(1),
  moderationState: z.enum(["approved", "queued", "rejected"])
});

export type AssetEvent = z.infer<typeof assetEventSchema>;

export function selectLifecycleDecision(event: AssetEvent): "send" | "hold" {
  return event.moderationState === "approved" ? "send" : "hold";
}

export function renderAssetApproved(event: AssetEvent) {
  return {
    to: event.playerEmail,
    subject: `${event.assetName} is live in ${event.eventName}`,
    html: `<h1>Nice work, ${event.playerName}</h1><p>Your player asset <strong>${event.assetName}</strong> passed moderation and is now part of ${event.eventName}.</p>`
  };
}

export async function processAssetEvent(input: unknown) {
  const event = assetEventSchema.parse(input);
  if (selectLifecycleDecision(event) === "hold") {
    return { state: "held", reason: "moderation queue" } as const;
  }
  const message = await sendEmail(renderAssetApproved(event));
  return { state: "sent", message_id: message.message_id } as const;
}
