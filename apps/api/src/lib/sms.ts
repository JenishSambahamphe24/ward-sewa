import type { Logger } from 'pino';

export interface SmsGateway {
  send(phone: string, message: string): Promise<void>;
}

// Stand-in until the BullMQ SMS job: writes the message to the log so the code can be read.
export class LogSmsGateway implements SmsGateway {
  readonly #logger: Logger;

  constructor(logger: Logger) {
    this.#logger = logger;
  }

  async send(phone: string, message: string): Promise<void> {
    this.#logger.info({ to: `******${phone.slice(-4)}`, message }, 'sms (log gateway)');
  }
}
