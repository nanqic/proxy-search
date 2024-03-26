import { corsHeaders, fetchHotwords, proxySearchDetail } from "./requests";
import { drizzle } from 'drizzle-orm/d1'
import { countUse, increaseDailyCount, removeLimit, } from "./db/dbUtil";

export interface Env {
	SEARCH_CACHE: KVNamespace
	DB: D1Database
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const setCache = async (key: string, data: string) => env.SEARCH_CACHE.put(key, data);
		const getCache = async (key: string) => env.SEARCH_CACHE.get(key);
		const getCacheList = async () => env.SEARCH_CACHE.list();
		const url = new URL(request.url);
		const searchParams = new URLSearchParams(url.search)
		const keywordsParam = decodeURI(searchParams.get('keywords') || '')
		let pageParam = decodeURI(searchParams.get('page') || '')

		const db = drizzle(env.DB);

		if (url.pathname === "/api" && keywordsParam != ''
			&& request.method == 'POST') {
			pageParam == '1' && (pageParam = '')

			let cache = await getCache(keywordsParam + pageParam)
			if (cache) {
				return new Response(cache, { headers: corsHeaders })
			}

			return await countUse(db, request, setCache, keywordsParam, pageParam)

		} else if (url.pathname === "/api/q" && request.method == 'GET') {
			const jsonParam = decodeURI(searchParams.get('json') || '')

			return await proxySearchDetail(jsonParam)
		} else if (url.pathname === "/api/hotwords") {
			return await fetchHotwords()
		} else if (url.pathname === "/api/visit") {
			return Response.json(await increaseDailyCount(db))
		}

		return Response.json('')
	},

	async scheduled(event: any, env: Env, ctx: ExecutionContext) {
		const db = drizzle(env.DB);
		ctx.waitUntil(removeLimit(db))
	},
};
