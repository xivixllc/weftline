import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { ApiError } from './lib/errors.js';
import { newRequestId } from './lib/ids.js';
import { authenticate, type Principal } from './services/auth.js';
import type { Ctx } from './services/events.js';
import { applicationRoutes } from './routes/applications.js';
import { grantRoutes } from './routes/grants.js';
import { mailboxRoutes } from './routes/mailbox.js';
import { webhookRoutes } from './routes/webhooks.js';

declare module 'fastify' {
  interface FastifyRequest {
    principal: Principal;
  }
}

const WINDOW_SEC = 60;

export async function buildApp(ctx: Ctx): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    genReqId: () => newRequestId(),
    requestIdHeader: false,
    bodyLimit: 5 * 1024 * 1024,
    routerOptions: { ignoreTrailingSlash: true },
  });

  // Fixed-window limiter per API key. On serverless each instance counts on its own, so this
  // is a guard against runaway clients, not an exact quota.
  const hits = new Map<string, { start: number; n: number }>();

  app.addHook('onRequest', async (req, reply) => {
    reply.header('x-request-id', req.id);
    if (!req.url.startsWith('/v3')) return;

    const header = req.headers.authorization ?? '';
    const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : undefined;
    const principal = await authenticate(ctx.db, bearer);
    if (!principal) throw new ApiError(401, 'unauthorized', 'missing, invalid or revoked API key');
    req.principal = principal;

    const now = Math.floor(Date.now() / 1000);
    const w = hits.get(principal.keyId);
    const cur = !w || now - w.start >= WINDOW_SEC ? { start: now, n: 0 } : w;
    cur.n++;
    hits.set(principal.keyId, cur);
    const reset = cur.start + WINDOW_SEC;
    reply.header('x-ratelimit-limit', ctx.cfg.rateLimitPerKey);
    reply.header('x-ratelimit-remaining', Math.max(0, ctx.cfg.rateLimitPerKey - cur.n));
    reply.header('x-ratelimit-reset', reset);
    if (cur.n > ctx.cfg.rateLimitPerKey) {
      reply.header('retry-after', Math.max(1, reset - now));
      throw new ApiError(429, 'rate_limit_error', 'too many requests');
    }
  });

  app.setErrorHandler((err: any, req: FastifyRequest, reply) => {
    const request_id = req.id;
    if (err instanceof ApiError) {
      return reply.code(err.status).send({
        request_id,
        error: { type: err.type, message: err.message, provider_error: err.providerError },
      });
    }
    if (err instanceof ZodError) {
      const message = err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
      return reply.code(400).send({
        request_id,
        error: { type: 'invalid_request_error', message, provider_error: null },
      });
    }
    const status = typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 500 ? err.statusCode : 500;
    if (status === 413) {
      return reply.code(413).send({
        request_id,
        error: { type: 'payload_too_large', message: 'request body too large; use an attachment upload session', provider_error: null },
      });
    }
    if (status < 500) {
      return reply.code(status).send({
        request_id,
        error: { type: 'invalid_request_error', message: err.message, provider_error: null },
      });
    }
    app.log.error(err);
    return reply.code(500).send({
      request_id,
      error: { type: 'api_error', message: 'internal error; report the request_id', provider_error: null },
    });
  });

  app.setNotFoundHandler((req, reply) =>
    reply.code(404).send({
      request_id: req.id,
      error: { type: 'not_found_error', message: `no route for ${req.method} ${req.url.split('?')[0]}`, provider_error: null },
    }),
  );

  app.get('/healthz', async () => ({ ok: true }));

  await app.register(applicationRoutes(ctx));
  await app.register(grantRoutes(ctx));
  await app.register(webhookRoutes(ctx));
  await app.register(mailboxRoutes(ctx));
  return app;
}
