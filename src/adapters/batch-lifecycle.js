const DEFAULT_POLL_INTERVAL_MS = 10_000;
const DEFAULT_MAX_WAIT_MS = 24 * 60 * 60 * 1000;

const defaultSleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function waitForBatchCompletion({
  client,
  batchId,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  maxWaitMs = DEFAULT_MAX_WAIT_MS,
  sleep = defaultSleep,
  onStatus = () => {},
}) {
  const retrieve = client.messages?.batches?.retrieve;
  if (!retrieve) return null;

  const startedAt = Date.now();
  while (true) {
    const batch = await retrieve.call(client.messages.batches, batchId);
    onStatus(batch.processing_status, batch);
    if (batch.processing_status === "ended") return batch;

    if (Date.now() - startedAt >= maxWaitMs) {
      throw new Error(`Batch ${batchId} did not finish within ${maxWaitMs}ms; last status: ${batch.processing_status}`);
    }
    await sleep(pollIntervalMs);
  }
}

export const BATCH_POLLING_DEFAULTS = Object.freeze({
  pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
  maxWaitMs: DEFAULT_MAX_WAIT_MS,
});
