import 'dotenv/config';
import { runFeedbackAggregatorWorker } from './workers/feedbackAggregator.js';
import { runRedditWorker } from './workers/reddit.js';
import { runTelegramWorker } from './workers/telegram.js';
import { runTopicProcessorWorker } from './workers/topicProcessor.js';

const workerType = process.env.WORKER_TYPE;

if (!workerType) {
  console.error('Missing WORKER_TYPE. Expected reddit, telegram, topic-processor, or feedback-aggregator.');
  process.exit(1);
}

async function main() {
  if (workerType === 'reddit') {
    await runRedditWorker();
    return;
  }

  if (workerType === 'telegram') {
    await runTelegramWorker();
    return;
  }

  if (workerType === 'topic-processor') {
    await runTopicProcessorWorker();
    return;
  }

  if (workerType === 'feedback-aggregator') {
    await runFeedbackAggregatorWorker();
    return;
  }

  console.error(`Unsupported WORKER_TYPE: ${workerType}`);
  process.exit(1);
}

main().catch((error) => {
  console.error('Worker process failed:', error);
  process.exit(1);
});
