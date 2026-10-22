import express from 'express';
import type { Express } from 'express';
import type { Redis } from 'ioredis';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import type { Db } from './db/client.ts';
import type { FileStorage } from './lib/file-storage.ts';
import type { SmsGateway } from './lib/sms.ts';
import { requireAuth } from './middleware/auth.ts';
import { errorHandler, notFound } from './middleware/error-handler.ts';
import { ApplicationAccess } from './modules/applications/application-access.ts';
import { ApplicationsController } from './modules/applications/applications.controller.ts';
import { ApplicationsRepository } from './modules/applications/applications.repository.ts';
import { applicationsRouter } from './modules/applications/applications.routes.ts';
import { ApplicationsService } from './modules/applications/applications.service.ts';
import { AuthController } from './modules/auth/auth.controller.ts';
import { authRouter } from './modules/auth/auth.routes.ts';
import { AuthService } from './modules/auth/auth.service.ts';
import { OtpStore } from './modules/auth/otp.store.ts';
import { SessionStore } from './modules/auth/session.store.ts';
import { WardsRepository } from './modules/divisions/wards.repository.ts';
import { DocumentsController } from './modules/documents/documents.controller.ts';
import { DocumentsRepository } from './modules/documents/documents.repository.ts';
import { documentsRouter } from './modules/documents/documents.routes.ts';
import { DocumentsService } from './modules/documents/documents.service.ts';
import { healthRouter } from './modules/health/health.routes.ts';
import type { HealthCheck } from './modules/health/health.routes.ts';
import { LettersController } from './modules/letters/letters.controller.ts';
import { LettersRepository } from './modules/letters/letters.repository.ts';
import { lettersRouter } from './modules/letters/letters.routes.ts';
import { LettersService } from './modules/letters/letters.service.ts';
import { ReviewController } from './modules/review/review.controller.ts';
import { reviewRouter } from './modules/review/review.routes.ts';
import { ReviewService } from './modules/review/review.service.ts';
import { ServiceTypesController } from './modules/service-types/service-types.controller.ts';
import { ServiceTypesRepository } from './modules/service-types/service-types.repository.ts';
import { serviceTypesRouter } from './modules/service-types/service-types.routes.ts';
import { StaffController } from './modules/staff/staff.controller.ts';
import { StaffRepository } from './modules/staff/staff.repository.ts';
import { staffRouter } from './modules/staff/staff.routes.ts';
import { StaffService } from './modules/staff/staff.service.ts';
import { UsersController } from './modules/users/users.controller.ts';
import { UsersRepository } from './modules/users/users.repository.ts';
import { usersRouter } from './modules/users/users.routes.ts';
import { UsersService } from './modules/users/users.service.ts';

export interface AppDeps {
  logger: Logger;
  db: Db;
  redis: Redis;
  sms: SmsGateway;
  storage: FileStorage;
  authSecret: string;
  healthChecks: Record<string, HealthCheck>;
  healthTimeoutMs?: number;
}

// Opens no connections: tests pass fakes or test databases, server.ts passes real clients.
export function createApp(deps: AppDeps): Express {
  const users = new UsersRepository(deps.db);
  const wards = new WardsRepository(deps.db);
  const serviceTypes = new ServiceTypesRepository(deps.db);
  const documents = new DocumentsRepository(deps.db);
  const auth = new AuthService({
    otp: new OtpStore(deps.redis, deps.authSecret),
    sessions: new SessionStore(deps.redis),
    users,
    sms: deps.sms,
  });
  const authenticated = requireAuth(auth);

  const app = express();

  app.disable('x-powered-by');
  app.use(pinoHttp({ logger: deps.logger }));
  app.use(express.json({ limit: '100kb' }));

  app.use(healthRouter(deps.healthChecks, { timeoutMs: deps.healthTimeoutMs }));
  app.use(authRouter(new AuthController(auth), authenticated));
  app.use(usersRouter(new UsersController(new UsersService(users)), authenticated));
  app.use(serviceTypesRouter(new ServiceTypesController(serviceTypes)));
  const applicationsRepository = new ApplicationsRepository(deps.db);
  const access = new ApplicationAccess(applicationsRepository);
  const applications = new ApplicationsService({
    applications: applicationsRepository,
    serviceTypes,
    wards,
    documents,
    access,
  });
  app.use(applicationsRouter(new ApplicationsController(applications), authenticated));
  app.use(
    documentsRouter(
      new DocumentsController(
        new DocumentsService({
          applications,
          access,
          serviceTypes,
          documents,
          storage: deps.storage,
        }),
      ),
      authenticated,
    ),
  );
  app.use(
    reviewRouter(
      new ReviewController(new ReviewService({ applications: applicationsRepository, access })),
      authenticated,
    ),
  );
  app.use(
    lettersRouter(
      new LettersController(
        new LettersService({
          letters: new LettersRepository(deps.db, applicationsRepository),
          access,
        }),
      ),
      authenticated,
    ),
  );
  app.use(
    staffRouter(
      new StaffController(new StaffService({ staff: new StaffRepository(deps.db), users, wards })),
      authenticated,
    ),
  );

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
