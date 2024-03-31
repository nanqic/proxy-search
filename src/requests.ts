
export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=604800'
};

export interface SearchComment {
    keywords: string
    comment: string
    link: string
}

export async function postSearchData({ keywords, comment, link }: SearchComment) {
    const url = 'https://comment.ningway.com/api/comment/202c';
    const data = {
        comment,
        nick: '@' + keywords,
        url: '/cc202c',
        ua: navigator.userAgent,
        link
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        console.error('Error:', response.status);
    }
}

export const listenMilareba = (): Response => {
    return new Response(`今日资源有限，先听一下米拉日巴大师的 <a href='//a.hdcxb.net/login2' target='_blank'>道歌</a> 吧`, { headers: corsHeaders })
}

export const toOfficialSite = (): Response => {
    return new Response(`服务资源有限，您的网络可以直接在 <a href='//https://ziguijia.com/search?keywords=%E4%B8%BA%E5%88%A9%E4%BB%96' target='_blank'>官网</a> 搜索。如有问题请联系QQ：<a href='https://qm.qq.com/q/EuMCvavDpe' target='_blank'> oningway </a>`, { headers: corsHeaders })
}

export async function proxySearch(setCache: (key: string, data: string) => Promise<void>, keywords: string, page: string): Promise<Response> {
    let url = `https://ziguijia.com/search/subtitle/${encodeURI(keywords)}?page=${page}`
    const res = await fetch(url)
    let text = await res.text()
    const regx = new RegExp(`<(script|style|footer|button)(.|\n)*?>(.|\n)*?</(script|style|footer|button)>|<!DOC(.|\n)*?<(hr/?)>|播放全部`)
    const regx2 = new RegExp(`href="/j\\?code(=\\w{5}(?:&amp;start=\\d{1,5})?)".target="\\w{5,6}"`, "ig")
    const regx3 = new RegExp(`(?:class="page" )?href="/search/subtitle/(\\S{1,512}\\?page=\\d{1,2})"`, "ig")

    text = text.replace(regx, '')
    const regxs = new RegExp(`<script(.|\n)*></script>`)
    text = text.replace(regxs, '')
    text = text.replace(regx2, (a, b) => {
        // console.log(a,b);
        return `onclick=window.open("/video/${btoa(b.replace('amp;', ''))}")`
    })
    text = text.replace(regx3, (a, b) => {
        // console.log(a, b, `onclick=window.open("/vsearch/+${b}")`);
        return `onclick=window.open("/vsearch/${b}")`
    })

    let codes = getCodes(text)
    text = text.replace(/&(?:amp;)?cat=null&(?:amp;)?type=subtitle&(?:amp;)?sort=appears/, codes)

    if (!text.includes("没有视频符合")) {
        await setCache(keywords + page, text)
    }

    return new Response(text, {
        headers: corsHeaders
    });
}

export async function proxySearchDetail(jsonParam: string) {
    // console.log(jsonParam);
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
        codes += `&code=${codeValue}`
    }
    return codes
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