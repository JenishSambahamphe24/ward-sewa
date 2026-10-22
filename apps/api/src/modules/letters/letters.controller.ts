import type { Request, Response } from 'express';
import { RequestHelper } from '../../lib/request.helper.ts';
import type { IssuedLetter } from './letters.repository.ts';
import type { LettersService } from './letters.service.ts';

const toView = (letter: IssuedLetter) => ({
  letterNo: letter.letterNo,
  fiscalYear: letter.fiscalYear,
  issuedDateBs: letter.issuedDateBs,
  issuedAt: letter.issuedAt,
  verificationCode: letter.verificationCode,
  pdfReady: letter.pdfStorageKey !== null,
  ...letter.snapshot,
});

// Public: enough to confirm a paper letter is genuine, nothing more (no phone, no form data).
const toPublicView = ({ letterNo, issuedDateBs, snapshot }: IssuedLetter) => ({
  valid: true,
  letterNo,
  issuedDateBs,
  applicantName: snapshot.applicant.name,
  serviceType: snapshot.serviceType,
  issuedBy: { localLevel: snapshot.address.localLevel, wardNo: snapshot.address.wardNo },
});

export class LettersController {
  readonly #letters: LettersService;

  constructor(letters: LettersService) {
    this.#letters = letters;
  }

  issue = async (req: Request, res: Response) => {
    const staff = RequestHelper.user(req);
    const letter = await this.#letters.issue(staff, req.params.id, req.body);
    req.log.info(
      { actorId: staff.id, applicationId: letter.applicationId, letterId: letter.id },
      'letter issued',
    );
    res.status(201).json({ letter: toView(letter) });
  };

  forApplication = async (req: Request, res: Response) => {
    const letter = await this.#letters.forApplication(RequestHelper.user(req), req.params.id);
    res.json({ letter: toView(letter) });
  };

  pdf = async (req: Request, res: Response) => {
    const { letter, data } = await this.#letters.pdf(RequestHelper.user(req), req.params.id);
    res.attachment(`${letter.letterNo.replace('/', '-')}.pdf`);
    res.set({ 'Content-Type': 'application/pdf', 'X-Content-Type-Options': 'nosniff' });
    res.send(data);
  };

  verify = async (req: Request, res: Response) => {
    res.json(toPublicView(await this.#letters.verify(req.params.code)));
  };
}
