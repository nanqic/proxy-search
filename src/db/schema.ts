import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const reqCount = sqliteTable('ReqCount', {
    id: integer('Id').primaryKey(),
    ip: text('Ip').notNull(),
    req: integer('Req').notNull(),
    newReq: integer('NewReq').notNull(),
    country: text('Country'),
    status: text('Status'),
    date: text('Date').notNull()
}, (reqCount) => ({
    ipIdx: uniqueIndex('ipIdx').on(reqCount.ip),
}));

export interface reqCountT {
    date: string;
    id: number;
    ip: string;
    req: number;
    newReq: number;
    country: string | null;
    status: string | null;
}