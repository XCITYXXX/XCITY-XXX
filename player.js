
/* =================================
   XCITY - PEEPLAYER VIDEO SYSTEM
================================= */

const playerContainer = document.getElementById("playerContainer");
const playerMessage = document.getElementById("playerMessage");

const watchTitle = document.getElementById("watchTitle");
const watchViews = document.getElementById("watchViews");
const watchDuration = document.getElementById("watchDuration");
const suggestedVideos = document.getElementById("suggestedVideos");

const themeToggle = document.getElementById("themeToggle");

const params = new URLSearchParams(window.location.search);
const videoId = params.get("id");

/* FORMAT TIME */

function formatTime(seconds) {
    if (!Number.isFinite(Number(seconds))) return "00:00";

    const total = Math.floor(Number(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/* FORMAT VIEWS */

function formatPlayerViews(number) {
    const views = Number(number) || 0;

    if (views >= 1000000) {
        return (views / 1000000).toFixed(1) + " مليون مشاهدة";
    }

    if (views >= 1000) {
        return (views / 1000).toFixed(1) + " ألف مشاهدة";
    }

    return views + " مشاهدة";
}

/* FORMAT DURATION */

function formatPlayerDuration(seconds) {
    const total = Number(seconds) || 0;

    if (!total) return "المدة غير محددة";

    return formatTime(total);
}

/* PLAYER MESSAGE */

function showPlayerMessage(message) {
    if (!playerMessage) return;

    playerMessage.textContent = message;
    playerMessage.style.display = "flex";
}

/* VALIDATE URL */

function isValidVideoUrl(url) {
    try {
        const parsed = new URL(url);

        return (
            parsed.protocol === "https:" ||
            parsed.protocol === "http:"
        );
    } catch {
        return false;
    }
}

/* PEEPLAYER IFRAME */

function loadExternalPlayer(url) {
    if (!playerContainer || !isValidVideoUrl(url)) {
        showPlayerMessage("رابط تشغيل الفيديو غير صالح.");
        return;
    }

    let iframe = playerContainer.querySelector("iframe");

    if (!iframe) {
        iframe = document.createElement("iframe");

        iframe.width = "100%";
        iframe.height = "100%";
        iframe.frameBorder = "0";
        iframe.scrolling = "no";
        iframe.title = "مشغل فيديو XCITY";
        iframe.allow = "autoplay; fullscreen; encrypted-media; picture-in-picture";
        iframe.allowFullscreen = true;

        iframe.style.position = "absolute";
        iframe.style.inset = "0";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "0";

        playerContainer.appendChild(iframe);
    }

    iframe.src = url;
}

/* START WATCH BUTTON */

function createStartWatchButton(video) {
    if (!playerContainer) return;

    if (!isValidVideoUrl(video.external_video_url)) {
        showPlayerMessage("رابط تشغيل الفيديو غير صالح.");
        return;
    }

    playerContainer.querySelector(".start-watch-overlay")?.remove();

    playerContainer.querySelector("iframe")?.remove();

    const computedPosition = window.getComputedStyle(
        playerContainer
    ).position;

    if (computedPosition === "static") {
        playerContainer.style.position = "relative";
    }

    const overlay = document.createElement("div");

    overlay.className = "start-watch-overlay";

    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.zIndex = "10";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.background = "rgba(0, 0, 0, 0.65)";

    const button = document.createElement("button");

    button.type = "button";
    button.className = "start-watch-button";
    button.textContent = "▶ ابدأ المشاهدة";
    button.setAttribute("aria-label", "ابدأ مشاهدة الفيديو");

    button.style.padding = "15px 30px";
    button.style.border = "none";
    button.style.borderRadius = "10px";
    button.style.background = "#ff9800";
    button.style.color = "#ffffff";
    button.style.fontSize = "18px";
    button.style.fontWeight = "bold";
    button.style.cursor = "pointer";

    button.addEventListener("click", async () => {
        button.disabled = true;
        button.textContent = "جارٍ تشغيل الفيديو...";

        // إزالة زر البداية
        overlay.remove();

        // تحميل مشغل PeePlayer
        loadExternalPlayer(video.external_video_url);

        // تسجيل المشاهدة بعد ضغط الزائر
        await recordVideoView(video.id);
    });

    overlay.appendChild(button);
    playerContainer.appendChild(overlay);
}

/* THEME */

if (themeToggle) {
    const savedTheme = localStorage.getItem("xcity-theme");

    if (savedTheme === "light") {
        document.body.classList.add("light-mode");
        themeToggle.textContent = "☾";
    }

    themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("light-mode");

        const isLight =
            document.body.classList.contains("light-mode");

        localStorage.setItem(
            "xcity-theme",
            isLight ? "light" : "dark"
        );

        themeToggle.textContent = isLight ? "☾" : "☀";
    });
}

/* RECORD VIDEO VIEW - 30 MINUTES */

async function recordVideoView(id) {
    const viewKey = "xcity_view_" + id;
    const lastView = Number(localStorage.getItem(viewKey)) || 0;
    const now = Date.now();

    // منع احتساب الزيارة المتكررة خلال 30 دقيقة
    if (now - lastView < 30 * 60 * 1000) {
        return;
    }

    try {
        const { data, error } = await supabaseClient.rpc(
            "increment_video_views",
            { p_video_id: id }
        );

        if (error) {
            console.error("View Counter Error:", error);
            return;
        }

        if (data !== null && data !== undefined) {
            localStorage.setItem(viewKey, String(now));

            if (watchViews) {
                watchViews.textContent = formatPlayerViews(data);
            }
        }
    } catch (error) {
        console.error("View Counter Error:", error);
    }
}

/* DYNAMIC VIDEO SEO */

function updateVideoSEO(video) {
    const title = video.title || "مشاهدة الفيديو";
    const description = video.description ||
        `شاهد ${title} على XCITY.`;

    const pageUrl = window.location.origin +
        window.location.pathname +
        "?id=" + encodeURIComponent(video.id);

    const imageUrl = video.cover_image_url || "";

    function setMeta(attribute, key, content) {
        if (!content) return;

        let element = document.querySelector(
            `meta[${attribute}="${key}"]`
        );

        if (!element) {
            element = document.createElement("meta");
            element.setAttribute(attribute, key);
            document.head.appendChild(element);
        }

        element.setAttribute("content", content);
    }

    document.title = title + " - XCITY";

    setMeta("name", "description", description);
    setMeta("property", "og:type", "video.other");
    setMeta("property", "og:title", title + " - XCITY");
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", pageUrl);
    setMeta("property", "og:image", imageUrl);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title + " - XCITY");
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", imageUrl);

    let canonical = document.querySelector(
        'link[rel="canonical"]'
    );

    if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
    }

    canonical.href = pageUrl;

    /* VIDEO STRUCTURED DATA */

    const oldSchema = document.getElementById("videoSchema");

    if (oldSchema) {
        oldSchema.remove();
    }

    const duration = Number(video.duration_seconds);

    const schema = {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": title,
        "description": description,
        "thumbnailUrl": imageUrl ? [imageUrl] : undefined,
        "embedUrl": video.external_video_url || undefined,
        "url": pageUrl,
        "duration": duration > 0
            ? "PT" + Math.floor(duration) + "S"
            : undefined,
        "uploadDate": video.created_at
            ? new Date(video.created_at).toISOString()
            : undefined
    };

    Object.keys(schema).forEach(key => {
        if (schema[key] === undefined) {
            delete schema[key];
        }
    });

    const script = document.createElement("script");
    script.id = "videoSchema";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);

    document.head.appendChild(script);
}

/* LOAD CURRENT VIDEO */

async function loadCurrentVideo() {
    if (!videoId) {
        if (watchTitle) {
            watchTitle.textContent = "الفيديو غير محدد";
        }

        showPlayerMessage("لم يتم تحديد فيديو للمشاهدة.");
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from("videos")
            .select(`
                id,
                title,
                description,
                external_video_url,
                cover_image_url,
                duration_seconds,
                views_count,
                category_id,
                status,
                created_at
            `)
            .eq("id", videoId)
            .eq("status", "approved")
            .single();

        if (error) throw error;

        if (!data) {
            throw new Error("الفيديو غير موجود.");
        }

        if (watchTitle) {
            watchTitle.textContent = data.title || "بدون عنوان";
        }

        if (watchViews) {
            watchViews.textContent =
                formatPlayerViews(data.views_count);
        }

        if (watchDuration) {
            watchDuration.textContent =
                formatPlayerDuration(data.duration_seconds);
        }

        updateVideoSEO(data);

        if (data.external_video_url) {
            if (isValidVideoUrl(data.external_video_url)) {
                createStartWatchButton(data);
            } else {
                showPlayerMessage("رابط الفيديو غير صالح.");
            }
        } else {
            // إبقاء مشغل الاختبار الموجود في الصفحة إن وجد
            const existingIframe =
                playerContainer?.querySelector("iframe");

            if (!existingIframe) {
                showPlayerMessage(
                    "لم يتم إضافة رابط تشغيل لهذا الفيديو."
                );
            }
        }

        await loadSuggestedVideos(data);

    } catch (error) {
        console.error("XCITY Player Error:", error);

        if (watchTitle) {
            watchTitle.textContent = "تعذر تحميل الفيديو";
        }

        showPlayerMessage(
            "حدث خطأ أثناء تحميل الفيديو. يرجى المحاولة لاحقاً."
        );
    }
}

/* SUGGESTED VIDEOS */

async function loadSuggestedVideos(currentVideo) {
    if (!suggestedVideos) return;

    suggestedVideos.innerHTML = "";

    try {
        let data = [];

        // أولاً: البحث عن فيديوهات من نفس التصنيف
        if (currentVideo.category_id) {
            const result = await supabaseClient
                .from("videos")
                .select(`
                    id,
                    title,
                    cover_image_url,
                    duration_seconds,
                    views_count
                `)
                .eq("status", "approved")
                .eq("category_id", currentVideo.category_id)
                .neq("id", currentVideo.id)
                .order("created_at", { ascending: false })
                .limit(6);

            if (result.error) throw result.error;

            data = result.data || [];
        }

        // ثانياً: إذا لم نجد، نعرض أحدث الفيديوهات المعتمدة
        if (data.length === 0) {
            const result = await supabaseClient
                .from("videos")
                .select(`
                    id,
                    title,
                    cover_image_url,
                    duration_seconds,
                    views_count
                `)
                .eq("status", "approved")
                .neq("id", currentVideo.id)
                .order("created_at", { ascending: false })
                .limit(6);

            if (result.error) throw result.error;

            data = result.data || [];
        }

        if (data.length === 0) {
            suggestedVideos.textContent =
                "لا توجد فيديوهات مقترحة حالياً.";
            return;
        }

        data.forEach(video => {
            const card = document.createElement("a");

            card.className = "suggested-card";
            card.href = "watch.html?id=" +
                encodeURIComponent(video.id);

            const image = document.createElement("img");

            image.src = video.cover_image_url || "";
            image.alt = video.title || "فيديو";
            image.loading = "lazy";

            image.addEventListener("error", () => {
                image.style.display = "none";
            });

            const information = document.createElement("div");
            information.className = "suggested-info";

            const title = document.createElement("h3");
            title.textContent = video.title || "بدون عنوان";

            const views = document.createElement("span");
            views.textContent =
                formatPlayerViews(video.views_count);

            const duration = document.createElement("span");
            duration.textContent =
                formatPlayerDuration(video.duration_seconds);

            information.appendChild(title);
            information.appendChild(views);
            information.appendChild(duration);

            card.appendChild(image);
            card.appendChild(information);

            suggestedVideos.appendChild(card);
        });

    } catch (error) {
        console.error("Suggested Videos Error:", error);

        suggestedVideos.textContent =
            "تعذر تحميل الفيديوهات المقترحة.";
    }
}

/* INITIALIZE */

loadCurrentVideo();
