const SUPABASE_URL = "https://vkkcinlasbpdfywcjfwf.supabase.co";
const SUPABASE_KEY = "sb_publishable_rn1JybmJ-wzvaXEgKCskGg_61Cf-uWG";

function escapeHTML(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatDuration(seconds) {
    const value = Number(seconds);

    if (!Number.isFinite(value) || value <= 0) {
        return undefined;
    }

    return "PT" + Math.floor(value) + "S";
}

function validDate(value) {
    if (!value) return undefined;

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? undefined
        : date.toISOString();
}

function errorResponse(status, message) {
    return new Response(message, {
        status,
        headers: {
            "Content-Type": "text/plain; charset=UTF-8",
            "X-Robots-Tag": "noindex, nofollow"
        }
    });
}

async function getVideo(id) {
    const query = new URLSearchParams({
        select: "id,title,description,external_video_url,cover_image_url,duration_seconds,created_at,status",
        id: "eq." + id,
        status: "eq.approved",
        limit: "1"
    });

    const response = await fetch(
        SUPABASE_URL + "/rest/v1/videos?" + query.toString(),
        {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: "Bearer " + SUPABASE_KEY
            }
        }
    );

    if (!response.ok) {
        throw new Error("Supabase request failed: " + response.status);
    }

    const videos = await response.json();

    return videos.length ? videos[0] : null;
}

function createSEOResponse(response, video, pageURL) {
    const title = video.title || "مشاهدة الفيديو";
    const description = video.description || title;
    const image = video.cover_image_url || "";

    const schema = {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": title,
        "description": description,
        "url": pageURL,
        "thumbnailUrl": image ? [image] : undefined,
        "embedUrl": video.external_video_url || undefined,
        "duration": formatDuration(video.duration_seconds),
        "uploadDate": validDate(video.created_at)
    };

    Object.keys(schema).forEach(key => {
        if (schema[key] === undefined) {
            delete schema[key];
        }
    });

    const seoHTML = `
        <meta name="description" content="${escapeHTML(description)}">
        <link rel="canonical" href="${escapeHTML(pageURL)}">

        <meta property="og:type" content="video.other">
        <meta property="og:title" content="${escapeHTML(title)}">
        <meta property="og:description" content="${escapeHTML(description)}">
        <meta property="og:url" content="${escapeHTML(pageURL)}">
        ${image ? `<meta property="og:image" content="${escapeHTML(image)}">` : ""}

        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${escapeHTML(title)}">
        <meta name="twitter:description" content="${escapeHTML(description)}">
        ${image ? `<meta name="twitter:image" content="${escapeHTML(image)}">` : ""}

        <script id="videoSchema" type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>
    `;

    return new HTMLRewriter()
        .on("head", {
            element(element) {
                element.append(seoHTML, { html: true });
            }
        })
        .on("title", {
            element(element) {
                element.setInnerContent(title);
            }
        })
        .on("#watchTitle", {
            element(element) {
                element.setInnerContent(title);
            }
        })
        .transform(response);
}
function escapeXML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

async function createSitemap(origin) {
    const videos = [];
    const pageSize = 1000;

    for (let offset = 0; ; offset += pageSize) {
        const query = new URLSearchParams({
            select: "id,created_at",
            status: "eq.approved",
            order: "created_at.desc",
            limit: String(pageSize),
            offset: String(offset)
        });

        const response = await fetch(
            SUPABASE_URL + "/rest/v1/videos?" + query.toString(),
            {
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: "Bearer " + SUPABASE_KEY
                }
            }
        );

        if (!response.ok) {
            throw new Error("Sitemap request failed: " + response.status);
        }

        const batch = await response.json();
        videos.push(...batch);

        if (batch.length < pageSize) break;
    }

    const urls = [
        `<url><loc>${escapeXML(origin + "/")}</loc></url>`
    ];

    for (const video of videos) {
        const pageURL = new URL("/watch.html", origin);
        pageURL.searchParams.set("id", video.id);

        const lastmod = validDate(video.created_at);

        urls.push(`
            <url>
                <loc>${escapeXML(pageURL.toString())}</loc>
                ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}
            </url>
        `);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${urls.join("\n")}
    </urlset>`;

    return new Response(xml, {
        headers: {
            "Content-Type": "application/xml; charset=UTF-8",
            "Cache-Control": "public, max-age=300",
        }
    });
}
export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (
    request.method === "GET" &&
    url.pathname === "/robots.txt"
) {
    return new Response(
        "User-agent: *\nAllow: /\n\nSitemap: " +
        url.origin +
        "/sitemap.xml",
        {
            headers: {
                "Content-Type": "text/plain; charset=UTF-8",
                "Cache-Control": "public, max-age=3600"
            }
        }
    );
}
if (
    request.method === "GET" &&
    url.pathname === "/sitemap.xml"
) {
    try {
        return await createSitemap(url.origin);
    } catch (error) {
        console.error("XCITY Sitemap Error:", error);

        return new Response("Sitemap temporarily unavailable", {
            status: 503,
            headers: {
                "Content-Type": "text/plain; charset=UTF-8"
            }
        });
    }
}
        if (
            request.method !== "GET" ||
            url.pathname !== "/watch.html"
        ) {
            return env.ASSETS.fetch(request);
        }

        const videoId = url.searchParams.get("id");

        if (
            !videoId ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(videoId)
        ) {
            return errorResponse(404, "Video not found");
        }

        try {
            const video = await getVideo(videoId);

            if (!video) {
                return errorResponse(404, "Video not found");
            }

            const assetURL = new URL("/watch.html", url.origin);

            const assetResponse = await env.ASSETS.fetch(
                new Request(assetURL.toString(), {
                    method: "GET",
                    headers: request.headers
                })
            );

            if (!assetResponse.ok) {
                return assetResponse;
            }

            const pageURL =
                url.origin +
                url.pathname +
                "?id=" +
                encodeURIComponent(video.id);

            return createSEOResponse(
                assetResponse,
                video,
                pageURL
            );

        } catch (error) {
            console.error("XCITY SEO Worker Error:", error);

            return errorResponse(
                503,
                "Temporarily unavailable"
            );
        }
    }
};