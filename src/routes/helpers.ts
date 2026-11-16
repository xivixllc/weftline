import type { FastifyRequest } from 'fastify';
import { notFound, providerRejected } from '../lib/errors.js';
import { pick } from '../lib/pagination.js';
import type { Ctx } from '../services/events.js';

export const LOCAL_PROVIDER = 'weftline';

export const ok = (req: FastifyRequest, data: unknown) => ({ request_id: req.id, data });

export function listOf(req: FastifyRequest, items: Record<string, unknown>[], select?: string, next?: string) {
  return {
    request_id: req.id,
    data: select ? items.map((i) => pick(i, select)) : items,
    ...(next ? { next_cursor: next } : {}),
  };
}

export interface GrantRow {
  id: string;
  application_id: string;
  provider: string;
  email: string;
  name: string | null;
  scope: string[];
  state: string | null;
  grant_status: string;
  settings_enc: string | null;
  workspace_id: string | null;
  blocked: boolean;
  created_at: number;
  updated_at: number;
}

/** Find a grant in the caller's application by ID or by email address. */
export async function resolveGrant(ctx: Ctx, applicationId: string, idOrEmail: string): Promise<GrantRow> {
  const r = await ctx.db.query<GrantRow>(
    `SELECT * FROM grants WHERE application_id=$1 AND (id=$2 OR lower(email)=lower($2))
      ORDER BY (id=$2) DESC LIMIT 1`,
    [applicationId, idOrEmail],
  );
  const g = r.rows[0];
  if (!g) throw notFound('grant');
  return g;
}

/** Mail routes only work on grants whose mailbox Weftline stores itself. */
export function requireLocal(g: GrantRow) {
  if (g.provider !== LOCAL_PROVIDER) {
    throw providerRejected(
      `the ${g.provider} connector is not implemented in this build; only ${LOCAL_PROVIDER} mailboxes support this route`,
    );
  }
}
