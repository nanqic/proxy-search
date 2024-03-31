import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const stat = sqliteTable('stat', {
    id: integer('id').primaryKey(),
    ip: text('ip').notNull(),
    total: integer('total').notNull(),
    daily: integer('daily'),
    city: text('city'),
    status: text('status'),
    words: text('words'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
}, (stat) => ({
    ipIdx: uniqueIndex('ipIdx').on(stat.ip),
}));

/**
 * req: 总缓存数;
 * newReq: 当日缓存数;
 */
export interface Stat {
    id: number;
    ip: string;
    total: number;
    daily: number | null
    city: string | null;
    status: string | null;
    words: string | null;
    createdAt: Date;
}