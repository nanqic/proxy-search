import { corsHeaders, fetchHotwords, proxySearchDetail } from "./requests";
import { drizzle } from 'drizzle-orm/d1'
import { countUse, getIpCountry, increaseDailyCount, removeLimit, } from "./db/dbUtil";

export interface Env {
	SEARCH_CACHE: KVNamespace
	DB: D1Database
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const ip = request.headers.get('CF-Connecting-IP') || ''
		const setCache = async (key: string, data: string) => env.SEARCH_CACHE.put(key, data);
		const getCache = async (key: string) => env.SEARCH_CACHE.get(key);
		// const getCacheList = async () => env.SEARCH_CACHE.list();
		const url = new URL(request.url);
		const searchParams = new URLSearchParams(url.search)
		const keywordsParam = decodeURI(searchParams.get('keywords') || '')
		let pageParam = decodeURI(searchParams.get('page') || '')
		const jsonParam = decodeURI(searchParams.get('json') || '')

		const db = drizzle(env.DB);

		if (url.pathname === "/api" && keywordsParam != ''
			&& request.method == 'POST') {
			pageParam == '1' && (pageParam = '')

			let cache = await getCache(keywordsParam + pageParam)
			if (cache) {
				return new Response(cache, { headers: corsHeaders })
			}

			// return await proxySearch(setCache, keywordsParam, pageParam)
			return await countUse(db, ip, getIpCountry(request), setCache, keywordsParam, pageParam)

		} else if (url.pathname === "/api/q" && request.method == 'GET') {
			return await proxySearchDetail(jsonParam)
		} else if (url.pathname === "/api/hotwords") {
			return await fetchHotwords()
		} else if (url.pathname === "/api/visit") {
			return Response.json(await increaseDailyCount(db, ip))
		}

		// return Response.json(await db.select().from(reqCount))
		return Response.json('')
	},

	async scheduled(event: any, env: Env, ctx: ExecutionContext) {
		const db = drizzle(env.DB);
		ctx.waitUntil(removeLimit(db))
	},
};
