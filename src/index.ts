import { proxySearch } from "./requests";

export interface Env {
	SEARCH_CACHE: string
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const searchParams = new URLSearchParams(url.search)
		const keywordsParam = decodeURI(searchParams.get('keywords') || '')
		const pageParam = decodeURI(searchParams.get('page') || '')
		console.log(`Hello ${navigator.userAgent} at path ${url.pathname}!`, keywordsParam);

		if (url.pathname === "/api" && keywordsParam != '') {
			return await proxySearch(request, keywordsParam, pageParam)
		}

		return new Response('');
	},
};
