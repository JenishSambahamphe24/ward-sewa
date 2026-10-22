import type { Request, Response } from 'express';
import { RequestHelper } from '../../lib/request.helper.ts';
import type { ReviewService } from './review.service.ts';

export class ReviewController {
  readonly #review: ReviewService;

  constructor(review: ReviewService) {
    this.#review = review;
  }

  queue = async (req: Request, res: Response) => {
    res.json(await this.#review.queue(RequestHelper.user(req), req.query));
  };

  get = async (req: Request, res: Response) => {
    res.json({ application: await this.#review.get(RequestHelper.user(req), req.params.id) });
  };

  transition = async (req: Request, res: Response) => {
    const staff = RequestHelper.user(req);
    const application = await this.#review.transition(staff, req.params.id, req.body);
    req.log.info(
      { actorId: staff.id, applicationId: application.id, status: application.status },
      'application transitioned',
    );
    res.json({ application });
  };
}
