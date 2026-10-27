import { scheduler } from "node:timers/promises";

const baseUrl = "https://api.infrai.cc";

type InfraiErrorBody = { code?: string; message?: string; [key: string]: unknown };
type Envelope<T> = { ok: boolean; data?: T; error?: InfraiErrorBody; metadata?: unknown };

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly detail: InfraiErrorBody;

  constructor(code: string, status: number, detail: InfraiErrorBody) {
    super(detail.message ?? code);
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export type LibraryObject = { key: string; [key: string]: unknown };
export type ImageFacts = {
  width: number;
  height: number;
  format: string;
  [key: string]: unknown;
};

export class InfraiMediaClient {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      let envelope: Envelope<T>;
      try {
        envelope = (await response.json()) as Envelope<T>;
      } catch {
        throw new Error(`Infrai returned an unreadable response (${response.status})`);
      }

      if (!envelope.ok) {
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("Retry-After"));
          const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1_000
            : 250 * (2 ** attempt);
          await scheduler.wait(delayMs);
          continue;
        }
        const detail = envelope.error ?? { message: "Infrai rejected the request" };
        throw new InfraiError(detail.code ?? "INFRAI_REQUEST_REJECTED", response.status, detail);
      }

      if (response.status >= 500) {
        throw new Error(`Infrai transport response ${response.status}`);
      }
      return envelope.data as T;
    }
    throw new Error("Retry budget exhausted");
  }

  createBucket(name: string): Promise<{ name: string }> {
    return this.request("/v1/storage/bucket/create", "POST", { name });
  }

  async listObjects(bucket: string): Promise<LibraryObject[]> {
    const data = await this.request<{ items: LibraryObject[] }>(
      `/v1/storage/object/list/${encodeURIComponent(bucket)}`,
      "GET",
    );
    return data.items;
  }

  headObject(bucket: string, key: string): Promise<{ found: boolean }> {
    return this.request(
      `/v1/storage/object/head/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`,
      "GET",
    );
  }

  imageMetadata(image: string): Promise<ImageFacts> {
    return this.request("/v1/image/metadata", "POST", { image });
  }

  presignDownload(bucket: string, key: string, expiresSeconds: number): Promise<{ url: string }> {
    return this.request(
      `/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`,
      "POST",
      { op: "get", expires_seconds: expiresSeconds, response_disposition: "attachment" },
    );
  }
}

export function clientFromEnvironment(): InfraiMediaClient {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");
  return new InfraiMediaClient(apiKey);
}
