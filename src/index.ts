import { proxySearch } from "./requests";

export interface Env {
	SEARCH_CACHE: KVNamespace
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const setCache = async (key: string, data: string) => env.SEARCH_CACHE.put(key, data);
		const getCache = async (key: string) => env.SEARCH_CACHE.get(key);
		const getCacheList = async () => env.SEARCH_CACHE.list();
		const url = new URL(request.url);
		const searchParams = new URLSearchParams(url.search)
		const keywordsParam = decodeURI(searchParams.get('keywords') || '')
		const pageParam = decodeURI(searchParams.get('page') || '')
		console.log(`Hello ${navigator.userAgent} at path ${url.pathname}!`, keywordsParam);

		if (url.pathname === "/api" && keywordsParam != '') {
			let cache = await getCache(keywordsParam)
			if (cache) {
				console.log('get cache', keywordsParam);
				return new Response(cache)
			}

			return await proxySearch(request, setCache, keywordsParam, pageParam)
		}

		return new Response('');
	},
};
