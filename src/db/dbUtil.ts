import { DrizzleD1Database } from "drizzle-orm/d1"
import { eq, ne, sql } from "drizzle-orm"
import { listenMilareba, proxySearch, toOfficialSite } from "../requests"
import { Stat, stat } from "./schema"

const allowedCities = [
    'Chifeng',
    '赤峰市',
]

interface IpResult {
    country: string;
    province: string;
    city: string;
    isp: string;
}

export const getCityByIp = async (ip: string): Promise<IpResult> => {
    const response = await fetch(`https://ip-query.vercel.app/api/ip?ip=${ip}`)
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
    let city = req.cf?.city + ''
    let ip = req.headers.get('CF-Connecting-IP') || ''

    // if (!city) {
    const { city: resCity, province } = await getCityByIp(ip)
    city = resCity || province
    // }
    return {
        ip,
        country: req.cf?.country + '',
        city,
        geo: {
            lon: (req.cf?.longitude + '').slice(0, -2),
            lat: (req.cf?.latitude + '').slice(0, -2),
        }
    }
}

export const countUse = async (db: DrizzleD1Database, req: Request, setCache: (key: string, data: string) => Promise<void>, keywords: string, page: string): Promise<Response> => {
    const info = await getIpInfo(req)
    const stats = await getStatByIp(db, info.ip.slice(0, 15))

    if (stats !== null) {
        let { id, daily, city, words } = stats
        if (info && info?.country != 'CN') {
            await db.insert(stat).values({ ip: info.ip, total: 1, city: info.city, date: formattedToday() })
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
        await db.insert(stat).values({ ip: info.ip?.slice(0, 15), total: 1, daily: 1, city: info.city || '', date: formattedToday(), geo: JSON.stringify(info.geo), words: keywords }).onConflictDoNothing()
    }

    return await proxySearch(setCache, keywords, page)
}

export const formattedToday = () => new Date().toLocaleDateString('zh-CN')

export const formattedYesterday = () => new Date(Date.now() - 86400000).toLocaleDateString('zh-CN')
