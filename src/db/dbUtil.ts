import { DrizzleD1Database } from "drizzle-orm/d1"
import { reqCount, reqCountT } from "./schema"
import { eq } from "drizzle-orm"
import { listenMilareba, postSearchData, proxySearch, toOfficialSite } from "../requests"

export const getCountryByIp = async (ip: string) => {
    const response = await fetch(`https://ipapi.co/${ip}/country/`)
    return await response.text()
}

export const getStatByIp = async (db: DrizzleD1Database, ip: string): Promise<reqCountT | null> => {
    const result = await db.select().from(reqCount).where(eq(reqCount.ip, ip))
    if (result.length === 1)
        return result[0]

    return null
}

export const removeLimit = async (db: DrizzleD1Database) => {
    await db.update(reqCount)
        .set({ req: 0, newReq: 0 })
        .where(eq(reqCount.date, formattedYesterday()))
        .execute()
}

export const increaseReqCount = async (db: DrizzleD1Database, id: number, req: number, newReq: number) => {
    db.update(reqCount)
        .set({ req: req + 1, newReq: newReq + 1 })
        .where(eq(reqCount.id, id))
        .execute()
}

export const getIpCountry = (req: Request): string => {
    return req.cf?.country + ''
}

export const countUse = async (db: DrizzleD1Database, ip: string, country: string, setCache: (key: string, data: string) => Promise<void>, keywords: string, page: string): Promise<Response> => {
    const counts = await getStatByIp(db, ip)
    if (counts != null) {
        const { id, req, newReq, country } = counts
        if (country != 'CN') {
            await db.insert(reqCount).values({ ip, req: 1, newReq: 1, country, date: formattedToday() })
                .onConflictDoNothing()
            return toOfficialSite()
        }

        if (newReq >= 12) {
            return listenMilareba()
        }
        // 增加计数
        await increaseReqCount(db, id, req, newReq)
    } else {
        // 创建计数
        await db.insert(reqCount).values({ ip, req: 1, newReq: 1, country, date: formattedToday() })
    }

    let ipAddr = ip.includes(':') ? `www.ipshudi.com/${ip}` : `ip.tool.chinaz.com/${ip}`
    await postSearchData({ keywords: keywords + page, comment: country, link: ipAddr })

    return await proxySearch(setCache, keywords, page)
}

export const formattedToday = () => new Date().toLocaleDateString('zh-CN')

export const formattedYesterday = () => new Date(Date.now() - 86400000).toLocaleDateString('zh-CN')
