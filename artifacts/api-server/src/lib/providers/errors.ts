/**
 * Shared provider error types.
 *
 * A `ProviderTimeoutError` means our client gave up waiting (AbortController
 * fired) — it does NOT mean the provider actually failed the request. The
 * provider may still complete the purchase on their end after we've stopped
 * listening. Callers MUST treat this differently from a clean failure
 * response (e.g. "insufficient balance", "invalid meter") where the provider
 * definitively told us the request did not succeed.
 */
export class ProviderTimeoutError extends Error {
  constructor(message = "Provider request timed out. Please try again.") {
    super(message);
    this.name = "ProviderTimeoutError";
  }
}
