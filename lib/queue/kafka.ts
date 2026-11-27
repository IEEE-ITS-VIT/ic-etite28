import "server-only";

// Serverless Kafka Event Producer
// Compatible with Upstash Kafka (Vercel Marketplace) or Confluent Cloud REST Proxy.

const KAFKA_URL =
  process.env.UPSTASH_KAFKA_REST_URL?.replace(/\/+$/, "") ||
  process.env.KAFKA_REST_URL?.replace(/\/+$/, "");
const KAFKA_USER = process.env.UPSTASH_KAFKA_REST_USERNAME || process.env.KAFKA_USER || "";
const KAFKA_PASS = process.env.UPSTASH_KAFKA_REST_PASSWORD || process.env.KAFKA_PASS || "";

export function isKafkaConfigured(): boolean {
  return Boolean(KAFKA_URL && KAFKA_USER && KAFKA_PASS);
}

export interface KafkaMessage {
  topic: string;
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Publishes an event to a Kafka topic asynchronously without blocking HTTP response latency.
 */
export async function publishKafkaEvent(
  topic: string,
  eventName: string,
  data: Record<string, unknown>
): Promise<void> {
  if (!isKafkaConfigured()) return;

  const payload: KafkaMessage = {
    topic,
    event: eventName,
    timestamp: new Date().toISOString(),
    data,
  };

  const auth = Buffer.from(`${KAFKA_USER}:${KAFKA_PASS}`).toString("base64");

  try {
    await fetch(`${KAFKA_URL}/produce/${topic}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({ value: JSON.stringify(payload) }),
      signal: AbortSignal.timeout(3000),
    });
  } catch (err) {
    // Non-blocking: never crash a user request if Kafka encounters network latency
    console.warn(`Kafka event publish warning (${topic}):`, err);
  }
}
