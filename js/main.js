/* =================================
   XCITY - MAIN JAVASCRIPT
   IMPROVED SEARCH & CATEGORIES
================================= */

const themeToggle = document.getElementById("themeToggle");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const videosGrid = document.getElementById("videosGrid");
const emptyMessage = document.getElementById("emptyMessage");
const sortSelect = document.getElementById("sortSelect");
const sectionTitle = document.getElementById("sectionTitle");
const resultsCount = document.getElementById("resultsCount");

const categoryLinks = document.querySelectorAll("[data-category]");

let videos = [];
let currentCategory = "all";
let currentSort = "latest";
let searchTimer = null;

/* =================================
   THEME
================================= */

function initializeTheme() {
    if (!themeToggle) return;

    const savedTheme = localStorage.getItem("xcity-theme");

    const isLight = savedTheme === "light";

    document.body.classList.toggle("light-mode", isLight);

    themeToggle.textContent = isLight ? "☾" : "☀";

    themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("light-mode");

        const lightMode =
            document.body.classList.contains("light-mode");

        localStorage.setItem(
            "xcity-theme",
            lightMode ? "light" : "dark"
        );

        themeToggle.textContent = lightMode ? "☾" : "☀";
    });
}

/* =================================
   FORMATTING
================================= */

function formatDuration(seconds) {
    const total = Number(seconds) || 0;

    if (total <= 0) return "";

    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainingSeconds = total % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatViews(number) {
    return new Intl.NumberFormat("ar").format(
        Number(number) || 0
    ) + " مشاهدة";
}

/* =================================
   LOAD CATEGORIES
================================= */

async function loadCategoriesFromDatabase() {
    if (!categoryLinks.length) return;

    const { data, error } = await supabaseClient
        .from("categories")
        .select("name, slug")
        .eq("active", true)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("Categories Error:", error);
        return;
    }

    categoryLinks.forEach(link => {
        const category = (data || []).find(item =>
            item.slug === link.dataset.category
        );

        if (category) {
            link.textContent = category.name;
        }
    });
}

/* =================================
   LOAD VIDEOS
================================= */

async function loadVideosFromDatabase() {
    if (!videosGrid || !emptyMessage) return;

    videosGrid.innerHTML = "";

    emptyMessage.textContent = "جارٍ تحميل الفيديوهات...";
    emptyMessage.style.display = "block";

    const { data, error } = await supabaseClient
        .from("videos")
        .select(`
            id,
            title,
            description,
            cover_image_url,
            preview_frames,
            duration_seconds,
            views_count,
            created_at,
            status,
            category:categories (
                name,
                slug
            )
        `)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Videos Error:", error);

        emptyMessage.textContent =
            "تعذر تحميل الفيديوهات. حاول مرة أخرى.";

        return;
    }

    videos = (data || []).map(video => {
        const categoryData = Array.isArray(video.category)
            ? video.category[0]
            : video.category;

        const frames = Array.isArray(video.preview_frames)
            ? video.preview_frames.filter(
                frame => typeof frame === "string"
            )
            : [];

        return {
            id: video.id,
            title: video.title || "بدون عنوان",
            description: video.description || "",
            viewsNumber: Number(video.views_count) || 0,
            views: formatViews(video.views_count),
            duration: formatDuration(video.duration_seconds),
            cover: video.cover_image_url || "",
            frames,
            categories: categoryData
                ? [categoryData.slug]
                : [],
            date: video.created_at
                ? new Date(video.created_at).getTime()
                : 0
        };
    });

    updateVideos();
}

/* =================================
   CREATE VIDEO CARD
================================= */

function createVideoCard(video) {
    const card = document.createElement("article");
    card.className = "video-card";

    const link = document.createElement("a");
    link.className = "video-link";
    link.href = "watch.html?id=" + encodeURIComponent(video.id);

    const thumbnail = document.createElement("div");
    thumbnail.className = "video-thumbnail";

    const image = document.createElement("img");
    image.className = "thumbnail-image";
    image.alt = video.title;
    image.loading = "lazy";

    if (video.cover) {
        image.src = video.cover;
    } else {
        thumbnail.classList.add("no-image");
    }

    const duration = document.createElement("span");
    duration.className = "video-duration";
    duration.textContent = video.duration;

    const previewIndicator = document.createElement("div");
    previewIndicator.className = "preview-indicator";
    previewIndicator.textContent = "معاينة";

    thumbnail.appendChild(image);

    if (video.duration) {
        thumbnail.appendChild(duration);
    }

    thumbnail.appendChild(previewIndicator);

    const info = document.createElement("div");
    info.className = "video-info";

    const title = document.createElement("h3");
    title.className = "video-title";
    title.textContent = video.title;

    const views = document.createElement("p");
    views.className = "video-views";
    views.textContent = video.views;

    info.appendChild(title);
    info.appendChild(views);

    link.appendChild(thumbnail);
    link.appendChild(info);
    card.appendChild(link);

    /* PREVIEW */

    let previewTimer = null;
    let currentFrame = 0;

    const canHover = window.matchMedia(
        "(hover: hover) and (pointer: fine)"
    );

    thumbnail.addEventListener("mouseenter", () => {
        if (!canHover.matches || !video.frames.length) return;

        clearInterval(previewTimer);

        currentFrame = 0;

        previewTimer = setInterval(() => {
            currentFrame =
                (currentFrame + 1) % video.frames.length;

            image.src = video.frames[currentFrame];
        }, 700);

        card.classList.add("is-previewing");
    });

    thumbnail.addEventListener("mouseleave", () => {
        clearInterval(previewTimer);
        previewTimer = null;
        currentFrame = 0;

        if (video.cover) {
            image.src = video.cover;
        }

        card.classList.remove("is-previewing");
    });

    image.addEventListener("error", () => {
        image.style.display = "none";
        thumbnail.classList.add("no-image");
    });

    return card;
}

/* =================================
   SEARCH AND FILTER
================================= */

function updateVideos() {
    if (!videosGrid) return;

    const keyword = searchInput
        ? searchInput.value.trim().toLocaleLowerCase("ar")
        : "";

    let results = videos.filter(video => {
        const searchableText =
            `${video.title} ${video.description}`
                .toLocaleLowerCase("ar");

        const matchesSearch =
            searchableText.includes(keyword);

        const matchesCategory =
            currentCategory === "all" ||
            video.categories.includes(currentCategory);

        return matchesSearch && matchesCategory;
    });

    /* SORTING */

    if (currentSort === "popular") {
        results.sort((a, b) =>
            b.viewsNumber - a.viewsNumber
        );
    } else {
        results.sort((a, b) =>
            b.date - a.date
        );
    }

    videosGrid.innerHTML = "";

    results.forEach(video => {
        videosGrid.appendChild(createVideoCard(video));
    });

    if (emptyMessage) {
        emptyMessage.textContent = keyword
            ? "لم يتم العثور على فيديوهات تطابق بحثك."
            : "لا توجد فيديوهات في هذا القسم حالياً.";

        emptyMessage.style.display =
            results.length ? "none" : "block";
    }

    if (resultsCount) {
        resultsCount.textContent =
            "عدد النتائج: " + results.length;
    }
}

/* =================================
   CATEGORY NAVIGATION
================================= */

categoryLinks.forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();

        currentCategory = link.dataset.category;

        categoryLinks.forEach(item => {
            item.classList.remove("active");
        });

        link.classList.add("active");

        if (sectionTitle) {
            sectionTitle.textContent =
                link.textContent.trim();
        }

        updateVideos();
    });
});

/* =================================
   SEARCH INPUT
================================= */

if (searchInput) {
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimer);

        searchTimer = setTimeout(() => {
            updateVideos();
        }, 250);
    });

    searchInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            clearTimeout(searchTimer);
            updateVideos();
        }
    });
}

if (searchButton) {
    searchButton.addEventListener("click", updateVideos);
}

/* =================================
   SORTING
================================= */

if (sortSelect) {
    sortSelect.addEventListener("change", () => {
        currentSort = sortSelect.value;
        updateVideos();
    });
}

/* =================================
   INITIALIZE
================================= */

async function initializeXCITY() {
    initializeTheme();

    if (!videosGrid) return;

    await loadCategoriesFromDatabase();
    await loadVideosFromDatabase();
}

initializeXCITY();