export const RANKED_REQUEST_RETRY_POLICY = Object.freeze({
  delaysMs: Object.freeze([180, 520]),
  maxAttempts: 3,
});

const TRANSIENT_POSTGRES_CODES = new Set([
  "53300",
  "57014",
  "57P01",
  "57P02",
  "57P03",
]);

function getHttpStatus(error) {
  const status = Number(error?.status ?? error?.context?.status);
  return Number.isInteger(status) ? status : null;
}

export function isTransientRankedRequestError(error) {
  const status = getHttpStatus(error);
  if (status === 408 || status === 429 || (status !== null && status >= 500)) return true;

  const code = String(error?.code ?? "");
  if (code.startsWith("08") || TRANSIENT_POSTGRES_CODES.has(code)) return true;

  const message = String(error?.message ?? error ?? "").toLowerCase();
  return error instanceof TypeError
    || message.includes("failed to fetch")
    || message.includes("network")
    || message.includes("timeout")
    || message.includes("timed out")
    || message.includes("connection");
}

function wait(milliseconds) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}

export async function retryRankedRequest(
  operation,
  {
    delaysMs = RANKED_REQUEST_RETRY_POLICY.delaysMs,
    maxAttempts = RANKED_REQUEST_RETRY_POLICY.maxAttempts,
    waitForDelay = wait,
  } = {},
) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;
      if (attempt >= maxAttempts || !isTransientRankedRequestError(error)) throw error;
      await waitForDelay(delaysMs[attempt - 1] ?? delaysMs.at(-1) ?? 0);
    }
  }
  throw new Error("랭킹 요청 재시도 횟수를 초과했습니다.");
}
