
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

export interface SearchComment {
    keywords: string
    comment: string
    ip: string
}

async function postSearchData({ keywords, comment, ip }: SearchComment) {
    const url = 'https://comment.ningway.com/api/comment/202cb962';
    const data = {
        comment: comment,
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


export async function proxySearch(keywords: string, page = 1): Promise<Response> {
    let url = `https://ziguijia.com/search/subtitle/${keywords}?page=${page}`
    const res = await fetch(url)
    let text = await res.text()
    const regx = new RegExp(`<(script|style|footer|button)(.|\n)*?>(.|\n)*?</(script|style|footer|button)>|<!DOC(.|\n)*?<(hr/?)>|播放全部`)
    const regx2 = new RegExp(`href="/j\\?code(=\\w{5}(?:&amp;start=\\d{1,5})?)".target="\\w{5,6}"`, "ig")
    console.log('regx', regx.test(text));
    console.log('regx2', regx2.test(text));
    // console.log(text);

    text = text.replace(regx, '')
    text = text.replace(regx2, (a, b) => {
        // console.log(a,b);
        return `onclick=window.open("/video/${btoa(b.replace('amp;', ''))}")`
    })

    let resp = JSON.stringify({ "msg": "ok", text })
    return new Response(resp, {
        headers: corsHeaders
    });
}