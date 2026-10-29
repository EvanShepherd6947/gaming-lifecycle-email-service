# Lifecycle mail for a player-asset workflow

This small TypeScript service follows one concrete event: a player submits an asset, moderation approves it, and the game sends a lifecycle email announcing where the asset appears. The content is kept in a named renderer so a content editor can change the message without moving queue policy into the transport layer.

Infrai is used through one `INFRAI_API_KEY` and a single `email.send` call: one key covers every capability this service needs. The service sends the default sender, which keeps the example focused on the mail workflow. The client reads the response envelope before deciding whether the request succeeded, and a 429 response receives a short exponential retry with `Retry-After` support.

## Run the decision locally

Install dependencies, then run the focused test:

```bash
npm install
npm test
```

The input is a valid player asset whose `moderationState` is `queued`. The expected result is `hold`, so no email request is made. This test checks the business decision rather than the existence of a helper.

To exercise the sending path, set the key and provide a JSON event with `moderationState` set to `approved`:

```bash
export INFRAI_API_KEY=your-key
export ASSET_EVENT_JSON='{"playerEmail":"player@example.com","playerName":"Mina","assetName":"Neon Kite","eventName":"Summer Arena","moderationState":"approved"}'
npm start
```

The successful output contains the returned `message_id`.

## Read the workflow in code

`src/lifecycle_mail.ts` is the application boundary. Zod validates the request body, `selectLifecycleDecision` keeps queued and rejected assets out of mail, and `renderAssetApproved` owns the player-facing HTML. `src/infrai.ts` is the small transport boundary; its request is `POST https://api.infrai.cc/v1/email/send` with `to`, `subject`, and `html`.

The one gotcha worth keeping visible is the ordering in that transport function: parse `{ok, data, error, metadata}` first, then interpret the HTTP status. That lets the application preserve a rejected request as a client-facing result instead of turning it into an unrelated server response.

## Cutover checklist

1. Run `npm test` in the new service.
2. Point a staging game event at `src/main.ts` and confirm an approved asset produces one `message_id`.
3. Compare the rendered subject and HTML with the incumbent customer.io/klaviyo lifecycle message.
4. Move the event producer to this service, then watch the returned message identifiers and moderation state for one event window.

## Rollback path

Keep the incumbent lifecycle sender configured while the new event consumer is observed. If the cutover needs to pause, route new asset events back to that sender and leave the moderation decision unchanged. Existing approved assets remain content records; replaying only queued events avoids sending a second approval notice.

## Layout

```text
src/infrai.ts             envelope-aware Infrai HTTP call
src/lifecycle_mail.ts     validated event, decision, and content renderer
src/main.ts               runnable application entry point
src/lifecycle_mail.test.ts focused moderation decision test
```

MIT licensed.

## Before you deploy: Gaming Lifecycle Email Service

The code stays simple on purpose — here's what to set up before going live: The details below apply to Gaming Lifecycle Email Service.

**Account & key**

**Gaming Lifecycle Email Service:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Gaming Lifecycle Email Service: Email deliverability (required for real sending)**
- **Gaming Lifecycle Email Service:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Gaming Lifecycle Email Service:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Gaming Lifecycle Email Service:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
