
export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

export interface SearchComment {
    keywords: string
    text: string
    ip: string
}

async function postSearchData({ keywords, text, ip }: SearchComment) {
    const url = 'https://comment.ningway.com/api/comment/202cb962';
    const data = {
        comment: text,
        nick: 'search_' + keywords,
        url: '/202cb962',
        ua: navigator.userAgent,
        link: ip
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


export async function proxySearch(request: Request, setCache: (key: string, data: string) => Promise<void>, keywords: string, page = '1'): Promise<Response> {
    let url = `https://ziguijia.com/search/subtitle/${encodeURI(keywords)}?page=${page}`
    const res = await fetch(url)
    let text = await res.text()
    const regx = new RegExp(`<(script|style|footer|button)(.|\n)*?>(.|\n)*?</(script|style|footer|button)>|<!DOC(.|\n)*?<(hr/?)>|播放全部`)
    const regx2 = new RegExp(`href="/j\\?code(=\\w{5}(?:&amp;start=\\d{1,5})?)".target="\\w{5,6}"`, "ig")
    const regx3 = new RegExp(`(?:class=\"page\" )?href="/search/subtitle/(\\S{1,33}\\?page=\\d)"`, "ig")

    text = text.replace(regx, '')
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

    if (!page || page == '1') {
        await setCache(keywords + page, text)
        console.log('write cache', keywords);
    }

    let ip = request.headers.get('CF-Connecting-IP') || ''
    ip = ip.includes(':') ? `ipw.cn/ipv6/?ip=${ip}` : `ip.tool.chinaz.com/${ip}`

    postSearchData({ keywords, text, ip })
    return new Response(text, {
        headers: corsHeaders
    });
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