import { randomBytes } from 'node:crypto';

export const newId = (prefix: string) => `${prefix}_${randomBytes(8).toString('hex')}`;
export const newRequestId = () => `req_${randomBytes(13).toString('hex').toUpperCase()}`;
export const nowSec = () => Math.floor(Date.now() / 1000);
