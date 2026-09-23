/**
 * Minimal structured logging for the Guest Preview.
 *
 * Deliberately allow-listed: a caller can only emit the fields declared in
 * `PreviewLogFields`. There is no free-form payload channel, so a business idea,
 * a prompt, a token, or an API key cannot reach the log by accident — only by
 * someone editing this file, which is reviewable.
 */

export type PreviewLogFields = {
  requestId: string;
  stage: string;
  outcome: "success" | "failure";
  latencyMs?: number;
  provider?: string;
  errorCode?: string;
  schemaValidationFailed?: boolean;
  rateLimitDecision?: "allowed" | "denied";
  rateLimitMode?: "durable" | "process_local";
  inputLength?: number;
  injectionSuspected?: boolean;
};

export function newRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function emit(level: "info" | "warn" | "error", fields: PreviewLogFields): void {
  const line = JSON.stringify({
    scope: "guest_preview",
    level,
    timestamp: new Date().toISOString(),
    ...fields,
  });

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export function logPreviewSuccess(fields: PreviewLogFields): void {
  emit("info", fields);
}

export function logPreviewFailure(fields: PreviewLogFields): void {
  // Rate limiting and unconfigured deployments are operator signals, not bugs.
  const expected = fields.errorCode === "RATE_LIMITED" || fields.errorCode === "NOT_CONFIGURED";
  emit(expected ? "warn" : "error", fields);
}
