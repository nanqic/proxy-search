import { corsHeaders, fetchHotwords, proxySearchDetail } from "./requests";
import { drizzle } from 'drizzle-orm/d1'
import { checkTsKey, countUse, increaseDailyCount, removeLimit, } from "./db/dbUtil";

export interface Env {
	SEARCH_CACHE: KVNamespace
	DB: D1Database
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			return await handleRequest(request, env, ctx)

		} catch (error) {
			// await sendErrorLog(error as Error);
			return new Response("Internal Server Error", { status: 500 });
		}
	},

	async scheduled(event: any, env: Env, ctx: ExecutionContext) {
		const db = drizzle(env.DB);
		ctx.waitUntil(removeLimit(db))
	},
};


async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	const setCache = async (key: string, data: string) => env.SEARCH_CACHE.put(key, data);
	const getCache = async (key: string) => env.SEARCH_CACHE.get(key);
	const deleteCache = async (key: string) => env.SEARCH_CACHE.delete(key);
	const getCacheList = async (cursor: string) => env.SEARCH_CACHE.list({ cursor: cursor });
	const url = new URL(request.url);
	const searchParams = new URLSearchParams(url.search)
	const keywordsParam = decodeURI(searchParams.get('q') || '')
	let pageParam = decodeURI(searchParams.get('page') || '')

	const db = drizzle(env.DB);

	if (url.pathname === "/api" && keywordsParam != ''
		&& request.method == 'POST'
	) {
		pageParam == '1' && (pageParam = '')
		let keyParam = decodeURI(searchParams.get('key') || '')
		if (!checkTsKey(keyParam))
			return new Response()

		return await countUse(db, request, getCache, setCache, keywordsParam, pageParam)

	} else if (url.pathname === "/api/q" && request.method == 'GET') {
		const jsonParam = decodeURI(searchParams.get('json') || '')

		return await proxySearchDetail(jsonParam)
	} else if (url.pathname === "/api/hotwords") {
		return await fetchHotwords()
	} else if (url.pathname === "/api/err-keys") {
		return Response.json('')
	}
	// rm error key by user search 
	else if (url.pathname === "/api/rm-keys"
		&& request.method == 'POST'
	) {
		let name = decodeURI(searchParams.get('name') || '')
		let res = await deleteCache(name)
		return new Response(`${name} delete ${res}`)
	} else if (url.pathname === "/api/visit") {
		return new Response(JSON.stringify(await increaseDailyCount(db, request)), {
			headers: corsHeaders
		})
	}

	return Response.json('')
};


