import type { FastifyPluginAsync } from 'fastify';
import { notFound } from '../lib/errors.js';
import type { Ctx } from '../services/events.js';
import { ok } from './helpers.js';

export const applicationRoutes =
  (ctx: Ctx): FastifyPluginAsync =>
  async (app) => {
    // Application details. Redirect URIs, branding and hosted-sign-in settings arrive with the hosted flow.
    app.get('/v3/applications', async (req) => {
      const r = await ctx.db.query<{ id: string; name: string; created_at: number; updated_at: number }>(
        'SELECT id, name, created_at, updated_at FROM applications WHERE id=$1',
        [req.principal.applicationId],
      );
      const a = r.rows[0];
      if (!a) throw notFound('application');
      return ok(req, {
        application_id: a.id,
        environment: 'production',
        branding: { name: a.name },
        callback_uris: [],
        created_at: a.created_at,
        updated_at: a.updated_at,
      });
    });
  };
