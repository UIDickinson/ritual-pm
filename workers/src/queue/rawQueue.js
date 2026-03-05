import { Queue } from 'bullmq';
import { getRedisConnection } from './connection.js';

const RAW_QUEUE_NAME = 'ingestion.raw';
let rawQueue;

function getQueue() {
  if (!rawQueue) {
    rawQueue = new Queue(RAW_QUEUE_NAME, {
      connection: getRedisConnection()
    });
  }

  return rawQueue;
}

export async function enqueueRawMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { enqueued: 0 };
  }

  const jobs = messages.map((message) => ({
    name: message.source,
    data: message,
    opts: {
      removeOnComplete: 1000,
      removeOnFail: 1000,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      jobId: `${message.source}:${message.sourceMessageId}`
    }
  }));

  await getQueue().addBulk(jobs);
  return { enqueued: jobs.length };
}

export async function drainRawMessages(limit = 200) {
  const queue = getQueue();
  const jobs = await queue.getJobs(['waiting'], 0, Math.max(limit - 1, 0), true);

  const drained = [];

  for (const job of jobs) {
    drained.push(job.data);
    await job.remove();
  }

  return drained;
}
