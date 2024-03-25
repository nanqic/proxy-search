import { DrizzleD1Database } from "drizzle-orm/d1"
import { reqCount, reqCountT } from "./schema"
import { eq, isNull, sql } from "drizzle-orm"
import { listenMilareba, postSearchData, proxySearch, toOfficialSite } from "../requests"

export const getCountryByIp = async (ip: string) => {
    const response = await fetch(`https://ipapi.co/${ip}/country/`)
    return await response.text()
}

const todayNumber = () => parseInt(formattedToday().slice(3).replaceAll('/', ''))

export const getStatByIp = async (db: DrizzleD1Database, ip: string): Promise<reqCountT | null> => {
    const result = await db.select().from(reqCount).where(eq(reqCount.ip, ip))
    if (result.length === 1)
        return result[0]

    return null
}

export const removeLimit = async (db: DrizzleD1Database) => {
    return await db.delete(reqCount)
        .where(isNull(reqCount.status))
        .returning({ deletedId: reqCount.id })
}

export const increaseDailyCount = async (db: DrizzleD1Database, ip: string) => {
    return db.insert(reqCount)
        .values({ id: todayNumber(), req: 1, newReq: 1, ip: '', status: ip, date: formattedToday() })
        .onConflictDoUpdate({
            target: reqCount.id,
            set: {
                req: sql`${reqCount.req} + 1`,
                newReq: sql`${reqCount.newReq} + 1`,
                status: ip,
            }
        })
        .returning({ count: reqCount.req })
}

export const increaseReqCount = async (db: DrizzleD1Database, id: number) => {
    db.update(reqCount)
        .set({
            req: sql`${reqCount.req} + 1`,
            newReq: sql`${reqCount.newReq} + 1`
        })
        .where(eq(reqCount.id, id))
        .execute()
}

export const getIpCountry = (req: Request): string => {
    return req.cf?.country + ''
}

export const countUse = async (db: DrizzleD1Database, ip: string, countryCode: string, setCache: (key: string, data: string) => Promise<void>, keywords: string, page: string): Promise<Response> => {

    const counts = await getStatByIp(db, ip)
    let ipAddr = `www.ipuu.net/query/ip?search=${ip}`
    if (counts != null) {
        const { id, newReq, country } = counts
        if (country != 'CN') {
            await db.insert(reqCount).values({ ip, req: 1, newReq: 1, country, date: formattedToday() })
                .onConflictDoNothing()

            return toOfficialSite()
        }

        if (newReq > 15 || ip == '') {
            await postSearchData({ keywords: keywords + page, comment: `${newReq} ${ip.slice(-3)}`, link: ipAddr })

            return listenMilareba()
        }
        // 增加计数
        await increaseReqCount(db, id)
    } else {
        // 创建计数
        await db.insert(reqCount).values({ ip, req: 1, newReq: 1, country: countryCode, date: formattedToday() })
    }

    return await proxySearch(setCache, keywords, page)
}

export const formattedToday = () => new Date().toLocaleDateString('zh-CN')

export const formattedYesterday = () => new Date(Date.now() - 86400000).toLocaleDateString('zh-CN')
