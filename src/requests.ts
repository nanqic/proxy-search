
export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=604800'
};

export interface SearchComment {
    keywords: string
    comment: string
    link?: string
}


export const listenMilareba = (): Response => {
    return new Response(`资源不可用`, { headers: corsHeaders })
}

export async function proxySearch(setCache: (key: string, data: string) => Promise<void>, keywords: string, page: string): Promise<Response> {
    // let url = `https://ziguijia.com/search?auth=733175&keywords=${encodeURI(keywords)}${page?'&page='+page:''}`

    let url = `https://ip.ningway.com/api/proxys?q=${keywords}${page ? '&page=' + page : ''}`
    // console.log("url:" ,url);

    const res = await fetch(url)
    let text = await res.text()
    const regx = new RegExp(`<(script|style|footer|button)(.|\n)*?>(.|\n)*?</(script|style|footer|button)>|<!DOC(.|\n)*?<(hr/?)>`)
    const regx2 = new RegExp(`href="/j\\?code(=\\w{5}(?:&amp;start=\\d{1,5})?)".target="\\w{5,6}"`, "ig")
    const regx3 = new RegExp(`(?:class="page" )?href="/search/subtitle/(\\S{1,512}\\?page=\\d{1,2})"`, "ig")

    text = text.replace(regx, '')
    const regxs = new RegExp(`<script(.|\n)*></script>`)
    text = text.replace(regxs, '')
    text = text.replace(regx2, (a, b) => {
        // console.log(a,b);
        return `onclick=window.open("/video?no${b.replace('amp;', '')}")`
    })
    text = text.replace(regx3, (a, b) => {
        // console.log(a, b, `onclick=window.open("/vsearch/+${b}")`);
        return `onclick=window.open("/vsearch/${b}")`
    })
    
    text = text
    .replace(/href="\/search/ig, ' target="_blank" href="/vsearch')
    .replace(/keywords=/ig, '/').replace(/\?auth=\d+&amp;/ig, '')
    .replace(/&(?:amp;)page/ig, '?page')

    // 播放全部链接替换
    text = text.replace(/\/vsearch\/player\//, `/search?codes=${getCodes(text)}&keywords=`)

    if (text.includes("视频")) {
        await setCache(keywords + page, text)
    }

    return new Response(text, {
        headers: corsHeaders
    });
}

export async function proxySearchDetail(jsonParam: string) {
    let n = `https://ziguijia.com/q/search/${encodeURI(jsonParam)}`
    let response = await fetch(n, {
        method: 'GET',
        headers: {
            'Cookie': 'connect.sid=s%3ASJaN9Qn_pYFK0QNNsvJKPvquEHq_Gch7.hPD9sQjfgDPL4vZc8xAv7IHLI5HtQRoVtPSgokji0fU',
            'Referer': 'https://ziguijia.com/search/subtitle/',
        }
    })
    return new Response(await response.text(), {
        headers: corsHeaders
    })
}

function getCodes(text: string): string {
    const regx = new RegExp(`data-code="(\\w{5})"`, "ig")
    let codes = ''
    let match;
    while ((match = regx.exec(text)) !== null) {
        const codeValue = match[1];
        codes += `${codeValue},`
    }
    return codes.slice(0, -1)
}

export async function fetchHotwords(): Promise<Response> {
    let siteurl = `https://ziguijia.com/search`
    const res = await fetch(siteurl)
    let text = await res.text()

    const regx = new RegExp(`<(script|style|footer|button)(.|\n)*?>(.|\n)*?</(script|style|footer|button)>|<!DOC(.|\n)*?<(hr/?)>`)
    text = text.replace(regx, '')

    let pattern = /<a.*?>(.*?)<\/a>/g;
    let match, words = [];

    while (match = pattern.exec(text)) {
        words.push(match[1]); // 匹配到的<a>标签内的内容
    }
    return new Response(JSON.stringify(words), {
        headers: corsHeaders
    })
}