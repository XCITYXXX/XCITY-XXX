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
                status
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
            console.log("بدأ تسجيل المشاهدة:", data.id);
            await recordVideoView(data.id);
            console.log("انتهى تسجيل المشاهدة");
        if (watchDuration) {
            watchDuration.textContent =
                formatPlayerDuration(data.duration_seconds);
        }

        document.title =
            (data.title || "مشاهدة الفيديو") + " - XCITY";

        if (data.external_video_url) {
            if (isValidVideoUrl(data.external_video_url)) {
                loadExternalPlayer(data.external_video_url);
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
        let query = supabaseClient
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

        if (currentVideo.category_id) {
            query = query.eq(
                "category_id",
                currentVideo.category_id
            );
        }

        const { data, error } = await query;

        if (error) throw error;

        if (!data || data.length === 0) {
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