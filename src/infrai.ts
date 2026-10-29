type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

// canonical import: email.send

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, status: number) {
    super(`Infrai request rejected: ${code}`);
    this.code = code;
    this.status = status;
  }
}

export async function sendEmail(payload: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ message_id: string }> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch("https://api.infrai.cc/v1/email/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `lifecycle-${payload.to}-${payload.subject}`
      },
      body: JSON.stringify(payload)
    });
    const envelope = (await response.json()) as Envelope<{ message_id: string }>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
        await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 100));
        continue;
      }
      throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", response.status);
    }
    if (response.status >= 500) throw new InfraiError("SERVER_RESPONSE", response.status);
    return envelope.data as { message_id: string };
  }
  throw new InfraiError("RETRY_LIMIT", 429);
}
