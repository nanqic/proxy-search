import { DrizzleD1Database } from "drizzle-orm/d1"
import { eq, ne, sql } from "drizzle-orm"
import { listenMilareba, proxySearch, toOfficialSite } from "../requests"
import { Stat, stat } from "./schema"

const allowedCities = [
    'Chifeng',
    'Neijiang',
    '赤峰市',
    '内江市',
]

interface IpResult {
    country: string;
    province: string;
    city: string;
    isp: string;
}

export const getCityByIp = async (ip: string): Promise<IpResult> => {
    const response = await fetch(`https://ip-query.vercel.app/api/ip/${ip}`)
    return await response.json() as IpResult
}

const todayNumber = () => parseInt(formattedToday().slice(3).replaceAll('/', ''))

export const getStatByIp = async (db: DrizzleD1Database, ip: string): Promise<Stat | null> => {
    const result = await db.select().from(stat).where(eq(stat.ip, ip))
    if (result.length === 1)
        return result[0]

    return null
}

export const removeLimit = async (db: DrizzleD1Database) => {
    return await db.update(stat)
        .set({ daily: 0 })
        .where(ne(stat.ip, 'retain'))
        .execute()
}

export const increaseDailyCount = async (db: DrizzleD1Database) => {
    return db.insert(stat)
        .values({ id: todayNumber(), total: 1, ip: 'retain', date: formattedToday() })
        .onConflictDoUpdate({
            target: stat.id,
            set: {
                total: sql`${stat.total} + 1`,
                // daily: sql`${stat.daily} + 1`,
            }
        })
        .returning({ count: stat.total })
}

export const increaseStat = async (db: DrizzleD1Database, id: number, words: string) => {
    db.update(stat)
        .set({
            total: sql`${stat.total} + 1`,
            daily: sql`${stat.daily} + 1`,
            words
        })
        .where(eq(stat.id, id))
        .execute()
}

interface IpInfo {
    ip: string
    country?: string
    city: string
    geo: {
        lon: string
        lat: string
    }
}
export const getIpInfo = async (req: Request): Promise<IpInfo> => {
    return {
        ip: req.headers.get('CF-Connecting-IP') || '',
        country: req.cf?.country + '',
        city: req.cf?.city + '',
        geo: {
            lon: (req.cf?.longitude + '').slice(0, -2),
            lat: (req.cf?.latitude + '').slice(0, -2),
        }
    }
}

export const countUse = async (db: DrizzleD1Database, req: Request, setCache: (key: string, data: string) => Promise<void>, keywords: string, page: string): Promise<Response> => {
    let { city, country, ip, geo } = await getIpInfo(req)
    const stats = await getStatByIp(db, ip.slice(0, 16))

    if (stats !== null) {
        let { id, daily, city, words } = stats
        if (country != 'CN') {
            await db.insert(stat).values({ ip: ip, total: 1, city: city, date: formattedToday(), status: 'limit', words: keywords })
                .onConflictDoNothing()
            return toOfficialSite()
        }

        if (daily && daily > 20 && !allowedCities.includes(city || '')) {
            return listenMilareba()
        }
        // 增加计数
        words = words?.includes(keywords) ? words : `${words}|${keywords}`
        await increaseStat(db, id, words)
    } else {
        // 创建计数
        let ipDetail
        if (city === 'undefined') {
            ipDetail = await getCityByIp(ip)
            const { city: cityres, province, country } = ipDetail
            city = cityres || province || country || '未知'
        }

        await db.insert(stat).values({ ip: ip?.slice(0, 16), total: 1, daily: 1, city, date: formattedToday(), geo: JSON.stringify(geo), words: keywords, status: ipDetail?.isp }).onConflictDoNothing()
    }

    return await proxySearch(setCache, keywords, page)
}

export const formattedToday = () => new Date().toLocaleDateString('zh-CN')

export const formattedYesterday = () => new Date(Date.now() - 86400000).toLocaleDateString('zh-CN')
