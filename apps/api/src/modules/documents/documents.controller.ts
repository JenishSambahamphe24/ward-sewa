import type { Request, Response } from 'express';
import { RequestHelper } from '../../lib/request.helper.ts';
import type { Document } from './documents.repository.ts';
import type { DocumentsService } from './documents.service.ts';

const toView = ({
  id,
  documentCode,
  originalName,
  mime,
  sizeBytes,
  sha256,
  createdAt,
}: Document) => ({
  id,
  documentCode,
  originalName,
  mime,
  sizeBytes,
  sha256,
  uploadedAt: createdAt,
});

export class DocumentsController {
  readonly #documents: DocumentsService;

  constructor(documents: DocumentsService) {
    this.#documents = documents;
  }

  upload = async (req: Request, res: Response) => {
    const file = req.file && { buffer: req.file.buffer, originalName: req.file.originalname };
    const document = await this.#documents.upload(
      RequestHelper.user(req),
      req.params.id,
      req.body,
      file,
    );
    res.status(201).json({ document: toView(document) });
  };

  list = async (req: Request, res: Response) => {
    const documents = await this.#documents.list(RequestHelper.user(req), req.params.id);
    res.json({ documents: documents.map(toView) });
  };

  download = async (req: Request, res: Response) => {
    const { document, data } = await this.#documents.download(
      RequestHelper.user(req),
      req.params.id,
      req.params.documentId,
    );
    res.attachment(document.originalName);
    res.set({ 'Content-Type': document.mime, 'X-Content-Type-Options': 'nosniff' });
    res.send(data);
  };
}
