import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';

export const LETTER_PDF_QUEUE = 'letter-pdf';

export interface LetterPdfJob {
  letterId: number;
}

export interface LetterPdfQueue {
  enqueue(letterId: number): Promise<void>;
}

export class BullLetterPdfQueue implements LetterPdfQueue {
  readonly #queue: Queue<LetterPdfJob>;

  constructor(connection: Redis) {
    this.#queue = new Queue<LetterPdfJob>(LETTER_PDF_QUEUE, { connection });
  }

  // jobId makes enqueueing idempotent: BullMQ ignores a second job with the same id.
  async enqueue(letterId: number): Promise<void> {
    await this.#queue.add(
      'render',
      { letterId },
      {
        jobId: `letter-${letterId}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    );
  }

  close(): Promise<void> {
    return this.#queue.close();
  }
}
