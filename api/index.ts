import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRuntime } from '../src/runtime.js';

// Vercel Function entry point: every request is routed here by vercel.json.
let ready: ReturnType<typeof createRuntime> | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  ready ??= createRuntime();
  const { app } = await ready;
  await app.ready();
  app.server.emit('request', req, res);
}
