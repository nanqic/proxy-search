import { DrizzleD1Database } from "drizzle-orm/d1"
import { and, eq, gte, isNotNull, lte, ne, sql } from "drizzle-orm"
import { corsHeaders, listenMilareba, proxySearch } from "../requests"
import { Stat, stat } from "./schema"

const limitedCities = [
    '',
    '珠海市',
    'Zhuhai',
]

const allowedCities = [
    'Chifeng',
    'Neijiang',
    '赤峰市',
    '内江市',
    '驻马店市',
    'Zhumadian',
    '烟台市',
    'Yantai',
    '西安市',
    'Xian'
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


const todayNumber = () => parseInt(new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }).slice(3).replaceAll('/', ''))


export const getStatByIp = async (db: DrizzleD1Database, ip: string): Promise<Stat | null> => {
    const result = await db.select().from(stat).where(eq(stat.ip, ip))
    if (result.length === 1)
        return result[0]

    return null
}

export const removeLimit = async (db: DrizzleD1Database) => {
    // db.delete(stat)
    //     .where(and(isNotNull(stat.words), lte(stat.createdAt, sql`(strftime('%s', 'now', '-3 days')`)))
    //     .execute()

    return await db.update(stat)
        .set({ daily: 0 })
        .where(isNotNull(stat.words))
        .execute()
}

export const increaseDailyCount = async (db: DrizzleD1Database, req: Request) => {
    let { city, ip, ua } = await getIpInfo(req)
    let count = await db.insert(stat)
        .values({ id: todayNumber(), total: 1, ip: todayNumber() + '', })
        .onConflictDoUpdate({
            target: stat.id,
            set: {
                total: sql`${stat.total} + 1`,
                ip: todayNumber() + '',
                city: '',
                words: '',
                status: ''
            }
        })
        .returning({ count: stat.total })

    return { ip, city, ua, count }
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
    ua: string
    isp: string
}
export const getIpInfo = async (req: Request): Promise<IpInfo> => {
    let city = req.cf?.city + ''
    let ip = req.headers.get('CF-Connecting-IP')?.slice(0, 16) || '未知ip'
    let isp = ''

    // if (city === 'undefined') {
    if (true) {
        const { city: cityres, province, country, isp: ispres } = await getCityByIp(ip)
        city = cityres || province || country || '未知'
        isp = ispres
    }

    return {
        ip,
        country: req.cf?.country + '',
        city,
        geo: {
            lon: (req.cf?.longitude + '').slice(0, -2),
            lat: (req.cf?.latitude + '').slice(0, -2),
        },
        ua: req.headers.get('User-Agent') + '',
        isp
    }
}

export const countUse = async (db: DrizzleD1Database, req: Request,
    getCache: (key: string) => Promise<string | null>,
    setCache: (key: string, data: string) => Promise<void>,
    keywords: string, page: string): Promise<Response> => {
    let { city, ip, ua, isp } = await getIpInfo(req)
    const stats = await getStatByIp(db, ip)

    if (stats !== null) {
        let { id, daily, city, words } = stats

        if ((daily && daily >= 21 && !allowedCities.includes(city || '')) ||
            limitedCities.includes(city || '')
        ) {
            return listenMilareba()
        }
        // 增加计数
        words = words?.includes(keywords) ? words : `${words}|${keywords}`
        await increaseStat(db, id, words)
    } else {
        // 创建计数

        var parser = require('ua-parser-js')
        let uastr = `${todayNumber()} ${parser(ua).os.name} ${parser(ua).browser.name} `

        await db.insert(stat).values({ ip, total: 1, daily: 1, city, words: keywords, status: uastr + isp })
            .onConflictDoUpdate({
                target: stat.id,
                set: {
                    total: sql`${stat.total} + 1`,
                    daily: sql`${stat.daily} + 1`,
                }
            })
            .execute()
    }

    let cache = await getCache(keywords + page)
    if (cache) {
        return new Response(cache, { headers: corsHeaders })
    }
    // return listenMilareba()

    return await proxySearch(setCache, keywords, page)
}

export const checkTsKey = (key: string): boolean => Math.abs(parseInt(Date.now().toString().slice(8, 10)) - parseInt(atob(key).slice(1, 3))) < 10 
