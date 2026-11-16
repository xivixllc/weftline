import { z } from 'zod';
import { badRequest } from './errors.js';

export const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  page_token: z.string().optional(),
  select: z.string().optional(),
});

export function decodeCursor(token?: string): number {
  if (!token) return 0;
  try {
    const { offset } = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    if (Number.isInteger(offset) && offset >= 0) return offset;
  } catch {
    /* fall through */
  }
  throw badRequest('page_token is not valid');
}

export const encodeCursor = (offset: number) =>
  Buffer.from(JSON.stringify({ offset })).toString('base64url');

/** Keep only the fields named in `select` (comma separated). */
export function pick<T extends Record<string, unknown>>(obj: T, select?: string): Partial<T> {
  if (!select) return obj;
  const keep = new Set(select.split(',').map((s) => s.trim()).filter(Boolean));
  return Object.fromEntries(Object.entries(obj).filter(([k]) => keep.has(k))) as Partial<T>;
}

/** Slice `rows` (fetched with limit + 1) into a page plus an optional next cursor. */
export function page<T>(rows: T[], limit: number, offset: number) {
  const more = rows.length > limit;
  return { items: more ? rows.slice(0, limit) : rows, next_cursor: more ? encodeCursor(offset + limit) : undefined };
}
