import { randomUUID } from 'node:crypto';
import type { FileStorage } from '../../lib/file-storage.ts';
import { LetterPdfHelper } from './letter-pdf.helper.ts';
import type { LettersRepository } from './letters.repository.ts';

export interface LetterPdfProcessorDeps {
  letters: LettersRepository;
  storage: FileStorage;
  publicBaseUrl: string;
}

export type ProcessResult = 'rendered' | 'already-rendered' | 'lost-race';

// Safe to run any number of times for the same letter: retries and duplicate jobs are harmless.
export class LetterPdfProcessor {
  readonly #deps: LetterPdfProcessorDeps;

  constructor(deps: LetterPdfProcessorDeps) {
    this.#deps = deps;
  }

  async process(letterId: number): Promise<ProcessResult> {
    const letter = await this.#deps.letters.findById(letterId);
    if (!letter) throw new Error(`Letter ${letterId} does not exist`);
    if (letter.pdfStorageKey) return 'already-rendered';

    const verifyUrl = new URL(`/verify/${letter.verificationCode}`, this.#deps.publicBaseUrl).href;
    const pdf = await LetterPdfHelper.render(letter, verifyUrl);
    const storageKey = `letters/${letter.id}/${randomUUID()}.pdf`;
    await this.#deps.storage.put(storageKey, pdf);

    if (await this.#deps.letters.attachPdf(letter.id, storageKey)) return 'rendered';
    await this.#deps.storage.delete(storageKey);
    return 'lost-race';
  }
}
