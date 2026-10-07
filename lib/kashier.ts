import { createHmac, timingSafeEqual } from "node:crypto";

const TEST_API_URL = "https://test-api.kashier.io";
const LIVE_API_URL = "https://api.kashier.io";

export class KashierConfigurationError extends Error {
  constructor() {
    super("Kashier payment configuration is incomplete.");
    this.name = "KashierConfigurationError";
  }
}

export type KashierConfiguration = {
  mode: "test" | "live";
  merchantId: string;
  secretKey: string;
  apiKey: string;
  paymentApiKey: string;
  apiUrl: string;
};

export function getKashierConfiguration(): KashierConfiguration {
  const mode = process.env.KASHIER_MODE ?? "test";
  const merchantId = process.env.KASHIER_MERCHANT_ID?.trim();
  const secretKey = process.env.KASHIER_SECRET_KEY?.trim();
  const apiKey = process.env.KASHIER_API_KEY?.trim();
  const paymentApiKey = process.env.KASHIER_PAYMENT_API_KEY?.trim();
  if (
    (mode !== "test" && mode !== "live") ||
    !merchantId ||
    !secretKey ||
    !apiKey ||
    !paymentApiKey
  ) {
    throw new KashierConfigurationError();
  }
  return {
    mode,
    merchantId,
    secretKey,
    apiKey,
    paymentApiKey,
    apiUrl: mode === "live" ? LIVE_API_URL : TEST_API_URL,
  };
}

export function isValidKashierWebhookSignature(
  data: Record<string, unknown>,
  signature: string | null,
  paymentApiKey: string
) {
  if (
    !signature ||
    !Array.isArray(data.signatureKeys) ||
    !data.signatureKeys.length ||
    !data.signatureKeys.every(
      (key): key is string =>
        typeof key === "string" &&
        Object.hasOwn(data, key) &&
        ["string", "number", "boolean"].includes(typeof data[key])
    )
  ) {
    return false;
  }

  const signaturePayload = [...new Set(data.signatureKeys)]
    .sort()
    .map((key) => {
      const value = String(data[key]);
      const encodedValue = encodeURIComponent(value).replace(
        /[!'()*]/g,
        (character) =>
          `%${character.charCodeAt(0).toString(16).toUpperCase()}`
      );
      return `${key}=${encodedValue}`;
    })
    .join("&");
  const expected = createHmac("sha256", paymentApiKey)
    .update(signaturePayload)
    .digest();
  if (!/^[a-f\d]{64}$/i.test(signature)) return false;
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function getPaymentSessionId(sessionUrl: string) {
  try {
    const parsed = new URL(sessionUrl);
    if (
      parsed.protocol !== "https:" ||
      !(parsed.hostname === "kashier.io" || parsed.hostname.endsWith(".kashier.io"))
    ) {
      return null;
    }
    const match = parsed.pathname.match(/^\/session\/([^/]+)\/?$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function getPublicAppUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL;
  if (!configuredUrl) throw new Error("The public application URL is not configured.");
  const url = new URL(configuredUrl);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("The public application URL must use HTTPS.");
  }
  return url.origin;
}
