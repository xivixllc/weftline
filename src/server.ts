import { createRuntime, runWorker } from './runtime.js';

const { app, ctx, cfg } = await createRuntime();
const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: process.env.HOST ?? '0.0.0.0' });
console.log(`weftline listening on :${port} (public URL ${cfg.publicUrl})`);

const stop = new AbortController();
if (cfg.workersInProcess) void runWorker(ctx, stop.signal);

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, async () => {
    stop.abort();
    await app.close();
    await ctx.db.close();
    process.exit(0);
  });
}
