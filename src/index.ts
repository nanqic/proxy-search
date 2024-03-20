import { corsHeaders, proxySearch, proxySearchDetail } from "./requests";

export interface Env {
	SEARCH_CACHE: KVNamespace
	SEARCH_STAT: KVNamespace
}

export const formattedDate = () => (new Date()).toLocaleDateString('zh-CN')

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const setCache = async (key: string, data: string) => env.SEARCH_CACHE.put(key, data);
		const getCache = async (key: string) => env.SEARCH_CACHE.get(key);
		const getStat = async (key: string) => env.SEARCH_STAT.get(key);
		const setStat = async (key: string, data: string) => env.SEARCH_STAT.put(key, data);
		const getCacheList = async () => env.SEARCH_CACHE.list();
		const url = new URL(request.url);
		const searchParams = new URLSearchParams(url.search)
		const keywordsParam = decodeURI(searchParams.get('keywords') || '')
		let pageParam = decodeURI(searchParams.get('page') || '')
		const jsonParam = decodeURI(searchParams.get('json') || '')

		// console.log(`Hello ${navigator.userAgent} at path ${url.pathname}!`, keywordsParam);
		const statIncrease = async (key: string) => await setStat(key, parseInt((await getStat(key)) || '0') + 1 + '')

		await statIncrease('request_since_0320')
		if (url.pathname === "/api" && keywordsParam != ''
			&& request.method == 'POST') {
			if (pageParam == '1') {
				pageParam = ''
			}

			let cache = await getCache(keywordsParam + pageParam)
			if (cache) {
				console.log('get cache', keywordsParam);
				return new Response(cache, {
					headers: corsHeaders
				})
			}

			await statIncrease(formattedDate())
			await statIncrease('cache_since_0320')
			return await proxySearch(request, setCache, keywordsParam, pageParam)
		} else if (url.pathname === "/api/q" && request.method == 'GET') {
			await statIncrease('detail_since_0320')

			return await proxySearchDetail(jsonParam)
		}

		await statIncrease('illegal_since_0320')

		return new Response(null)
	},
};
