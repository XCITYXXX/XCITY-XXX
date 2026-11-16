
/* =================================
   XCITY - ADMIN PANEL
================================= */

/* عناصر لوحة الإدارة */

const videoForm = document.getElementById("videoForm");
const adminVideos = document.getElementById("adminVideos");
const adminCategories = document.getElementById("adminCategories");
const videoCategory = document.getElementById("videoCategory");

const formMessage = document.getElementById("formMessage");
const formHeading = document.getElementById("formHeading");

const saveVideoButton = document.getElementById("saveVideoButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const logoutButton = document.getElementById("logoutButton");

const videoKeywords = document.getElementById("videoKeywords");

/* عناصر صورة الغلاف */

const videoCover = document.getElementById("videoCover");
const coverPreviewContainer = document.getElementById("coverPreviewContainer");
const coverPreviewImage = document.getElementById("coverPreviewImage");
const coverPreviewLabel = document.getElementById("coverPreviewLabel");
const clearCoverButton = document.getElementById("clearCoverButton");

/* إعدادات تخزين الصور */

const COVER_BUCKET = "video-covers";
const MAX_COVER_SIZE = 5 * 1024 * 1024;

const ALLOWED_COVER_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
];

let currentUser = null;
let currentStatus = "pending";
let categories = [];
let editingVideo = null;
let coverPreviewObjectUrl = null;


/* =================================
   إحصائيات لوحة الإدارة
================================= */

async function loadAdminStats() {

    const totalElement = document.getElementById("statTotalVideos");
    const approvedElement = document.getElementById("statApprovedVideos");
    const pendingElement = document.getElementById("statPendingVideos");
    const scheduledElement = document.getElementById("statScheduledVideos");
    const viewsElement = document.getElementById("statTotalViews");
    const topVideoElement = document.getElementById("statTopVideo");

    try {

        let allVideos = [];
        let offset = 0;
        const pageSize = 1000;

        while (true) {

            const { data, error } = await supabaseClient
                .from("videos")
                .select("title,status,views_count")
                .range(offset, offset + pageSize - 1);

            if (error) throw error;

            const videos = data || [];

            allVideos = allVideos.concat(videos);

            if (videos.length < pageSize) break;

            offset += pageSize;
        }

        const total = allVideos.length;

        const approved = allVideos.filter(
            video => video.status === "approved"
        ).length;

        const pending = allVideos.filter(
            video => video.status === "pending"
        ).length;

        const scheduled = allVideos.filter(
            video => video.status === "scheduled"
        ).length;

        const totalViews = allVideos.reduce(
            (sum, video) => sum + (Number(video.views_count) || 0),
            0
        );

        const topVideo = allVideos
            .filter(video => video.status === "approved")
            .sort(
                (a, b) =>
                    (Number(b.views_count) || 0) -
                    (Number(a.views_count) || 0)
            )[0];

        const formatNumber = number =>
            number.toLocaleString("ar");

        if (totalElement) {
            totalElement.textContent = formatNumber(total);
        }

        if (approvedElement) {
            approvedElement.textContent = formatNumber(approved);
        }

        if (pendingElement) {
            pendingElement.textContent = formatNumber(pending);
        }

        if (scheduledElement) {
            scheduledElement.textContent = formatNumber(scheduled);
        }

        if (viewsElement) {
            viewsElement.textContent = formatNumber(totalViews);
        }

        if (topVideoElement) {
            topVideoElement.textContent = topVideo
                ? topVideo.title
                : "لا يوجد فيديو منشور";
        }

    } catch (error) {

        console.error("Admin Statistics Error:", error);

        [
            totalElement,
            approvedElement,
            pendingElement,
            scheduledElement,
            viewsElement,
            topVideoElement
        ].forEach(element => {
            if (element) element.textContent = "خطأ";
        });
    }
}


/* =================================
   المظهر
================================= */

const themeToggle = document.getElementById("themeToggle");

if (localStorage.getItem("xcity-theme") === "light") {
    document.body.classList.add("light-mode");
}

if (themeToggle) {

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


/* =================================
   رسائل لوحة الإدارة
================================= */

function showMessage(message, success = false) {

    if (!formMessage) return;

    formMessage.textContent = message;
    formMessage.style.display = "block";

    formMessage.style.background = success
        ? "#164b31"
        : "#642525";

    formMessage.style.color = "#fff";
}

function hideMessage() {

    if (!formMessage) return;

    formMessage.style.display = "none";
}


/* =================================
   معاينة صورة الغلاف
================================= */

function releaseCoverPreviewUrl() {

    if (coverPreviewObjectUrl) {

        URL.revokeObjectURL(coverPreviewObjectUrl);

        coverPreviewObjectUrl = null;
    }
}

function showCoverPreview(imageUrl, label = "معاينة صورة الغلاف") {

    if (!coverPreviewContainer || !coverPreviewImage) return;

    if (!imageUrl) {

        hideCoverPreview();

        return;
    }

    coverPreviewImage.src = imageUrl;
    coverPreviewImage.alt = label;

    if (coverPreviewLabel) {
        coverPreviewLabel.textContent = label;
    }

    coverPreviewContainer.hidden = false;
}

function hideCoverPreview() {

    releaseCoverPreviewUrl();

    if (coverPreviewImage) {
        coverPreviewImage.removeAttribute("src");
    }

    if (coverPreviewContainer) {
        coverPreviewContainer.hidden = true;
    }
}

function restoreCurrentCoverPreview() {

    releaseCoverPreviewUrl();

    if (videoCover) {
        videoCover.value = "";
    }

    if (editingVideo && editingVideo.cover_image_url) {

        showCoverPreview(
            editingVideo.cover_image_url,
            "الصورة الحالية للفيديو"
        );

    } else {

        hideCoverPreview();
    }
}


/* =================================
   التحقق من صورة الغلاف
================================= */

function validateCoverFile(file) {

    if (!file) return null;

    if (!ALLOWED_COVER_TYPES.includes(file.type)) {

        return "صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WebP.";
    }

    if (file.size > MAX_COVER_SIZE) {

        return "حجم الصورة أكبر من 5 ميغابايت.";
    }

    if (file.size <= 0) {

        return "ملف الصورة فارغ أو غير صالح.";
    }

    return null;
}


/* =================================
   اختيار صورة من الجهاز
================================= */

if (videoCover) {

    videoCover.addEventListener("change", () => {

        hideMessage();

        const file = videoCover.files?.[0];

        if (!file) {

            restoreCurrentCoverPreview();

            return;
        }

        const validationError = validateCoverFile(file);

        if (validationError) {

            videoCover.value = "";

            restoreCurrentCoverPreview();

            showMessage(validationError);

            return;
        }

        releaseCoverPreviewUrl();

        coverPreviewObjectUrl = URL.createObjectURL(file);

        showCoverPreview(
            coverPreviewObjectUrl,
            "معاينة الصورة الجديدة"
        );
    });
}


/* =================================
   إلغاء اختيار صورة جديدة
================================= */

if (clearCoverButton) {

    clearCoverButton.addEventListener("click", () => {

        restoreCurrentCoverPreview();

        hideMessage();
    });
}


/* =================================
   رفع الصورة إلى Supabase Storage
================================= */

async function uploadCoverImage(file) {

    if (!file) {
        return null;
    }

    const validationError = validateCoverFile(file);

    if (validationError) {
        throw new Error(validationError);
    }

    if (!currentUser || !currentUser.id) {
        throw new Error("يجب تسجيل الدخول قبل رفع صورة الغلاف.");
    }

    const extensions = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp"
    };

    const extension = extensions[file.type];

    if (!extension) {
        throw new Error("صيغة الصورة غير مدعومة.");
    }

    const uniqueName =
        typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now() + "-" + Math.random().toString(36).slice(2);

    const filePath =
        `${currentUser.id}/${Date.now()}-${uniqueName}.${extension}`;

    const { data, error } = await supabaseClient
        .storage
        .from(COVER_BUCKET)
        .upload(filePath, file, {
            cacheControl: "31536000",
            contentType: file.type,
            upsert: false
        });

    if (error) {

        console.error("Cover Upload Error:", error);

        throw new Error(
            "تعذر رفع الصورة. تحقق من وجود حاوية " +
            COVER_BUCKET +
            " ومن صلاحيات الرفع في Supabase Storage. التفاصيل: " +
            error.message
        );
    }

    const uploadedPath = data?.path || filePath;

    const { data: publicData } = supabaseClient
        .storage
        .from(COVER_BUCKET)
        .getPublicUrl(uploadedPath);

    if (!publicData || !publicData.publicUrl) {

        throw new Error(
            "تم رفع الصورة، لكن تعذر إنشاء رابطها العام."
        );
    }

    return publicData.publicUrl;
}


/* =================================
   التحقق من المدير
================================= */

async function checkAdminAccess() {

    try {

        const { data: sessionData, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError) throw sessionError;

        const session = sessionData.session;

        if (!session) {

            alert("يرجى تسجيل الدخول أولاً.");

            window.location.href = "index.html";

            return false;
        }

        currentUser = session.user;

        const { data: isAdmin, error } =
            await supabaseClient.rpc("is_xcity_admin");

        if (error) throw error;

        if (isAdmin !== true) {

            alert("ليس لديك صلاحية الدخول إلى لوحة الإدارة.");

            window.location.href = "index.html";

            return false;
        }

        return true;

    } catch (error) {

        console.error("Admin Access Error:", error);

        alert("تعذر التحقق من صلاحيات المدير.");

        window.location.href = "index.html";

        return false;
    }
}


/* =================================
   تسجيل الخروج
================================= */

if (logoutButton) {

    logoutButton.addEventListener("click", async () => {

        const confirmed = confirm("هل تريد تسجيل الخروج؟");

        if (!confirmed) return;

        const { error } = await supabaseClient.auth.signOut();

        if (error) {

            alert("تعذر تسجيل الخروج.");

            return;
        }

        window.location.href = "index.html";
    });
}


/* =================================
   تحميل التصنيفات
================================= */

async function loadAdminCategories() {

    const { data, error } = await supabaseClient
        .from("categories")
        .select("id,name,slug,active,sort_order")
        .order("sort_order", { ascending: true });

    if (error) throw error;

    categories = data || [];

    videoCategory.innerHTML =
        '<option value="">اختر التصنيف</option>';

    categories
        .filter(category => category.active)
        .forEach(category => {

            const option = document.createElement("option");

            option.value = category.id;
            option.textContent = category.name;

            videoCategory.appendChild(option);
        });

    renderAdminCategories();
}


/* =================================
   عرض التصنيفات
================================= */

function renderAdminCategories() {

    adminCategories.innerHTML = "";

    const addForm = document.createElement("form");

    addForm.style.display = "flex";
    addForm.style.gap = "10px";
    addForm.style.flexWrap = "wrap";
    addForm.style.marginBottom = "20px";

    const input = document.createElement("input");

    input.type = "text";
    input.placeholder = "اسم التصنيف الجديد";
    input.required = true;

    input.style.flex = "1";
    input.style.minWidth = "180px";
    input.style.padding = "10px";

    const addButton = document.createElement("button");

    addButton.type = "submit";
    addButton.className = "admin-button";
    addButton.textContent = "إضافة تصنيف";

    addForm.append(input, addButton);

    addForm.addEventListener("submit", async event => {

        event.preventDefault();

        const name = input.value.trim();

        if (!name) return;

        addButton.disabled = true;

        try {

            const slug = "category-" + Date.now();

            const nextOrder = categories.length
                ? Math.max(...categories.map(c => c.sort_order || 0)) + 1
                : 1;

            const { error } = await supabaseClient
                .from("categories")
                .insert({
                    name,
                    slug,
                    active: true,
                    sort_order: nextOrder
                });

            if (error) throw error;

            await loadAdminCategories();

            showMessage("تمت إضافة التصنيف بنجاح.", true);

        } catch (error) {

            console.error(error);

            showMessage("تعذرت إضافة التصنيف: " + error.message);

        } finally {

            addButton.disabled = false;
        }
    });

    adminCategories.appendChild(addForm);

    if (!categories.length) {

        const empty = document.createElement("p");

        empty.className = "admin-empty";
        empty.textContent = "لا توجد تصنيفات.";

        adminCategories.appendChild(empty);

        return;
    }

    categories.forEach(category => {

        const row = document.createElement("div");

        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "center";
        row.style.gap = "10px";
        row.style.flexWrap = "wrap";
        row.style.padding = "12px";
        row.style.borderBottom = "1px solid #444";

        const name = document.createElement("span");

        name.textContent = category.name +
            (category.active ? "" : " (معطل)");

        const actions = document.createElement("div");

        actions.className = "admin-actions";

        const editButton = document.createElement("button");

        editButton.className = "edit-button";
        editButton.textContent = "تعديل الاسم";

        editButton.addEventListener("click", async () => {

            const newName = prompt(
                "اكتب الاسم الجديد:",
                category.name
            );

            if (!newName || !newName.trim()) return;

            try {

                const { error } = await supabaseClient
                    .from("categories")
                    .update({ name: newName.trim() })
                    .eq("id", category.id);

                if (error) throw error;

                await loadAdminCategories();

                showMessage("تم تعديل التصنيف.", true);

            } catch (error) {

                showMessage("تعذر تعديل التصنيف: " + error.message);
            }
        });

        const toggleButton = document.createElement("button");

        toggleButton.className = "delete-button";

        toggleButton.textContent = category.active
            ? "تعطيل"
            : "تفعيل";

        toggleButton.addEventListener("click", async () => {

            try {

                const { error } = await supabaseClient
                    .from("categories")
                    .update({ active: !category.active })
                    .eq("id", category.id);

                if (error) throw error;

                await loadAdminCategories();

                showMessage("تم تحديث حالة التصنيف.", true);

            } catch (error) {

                showMessage(
                    "تعذر تحديث حالة التصنيف: " + error.message
                );
            }
        });

        actions.append(editButton, toggleButton);

        row.append(name, actions);

        adminCategories.appendChild(row);
    });
}


/* =================================
   حفظ فيديو جديد أو تعديل فيديو
================================= */

videoForm.addEventListener("submit", async event => {

    event.preventDefault();

    hideMessage();

    saveVideoButton.disabled = true;

    try {

        const id = document.getElementById("videoId").value;

        const title = document.getElementById("videoTitle").value.trim();

        const description =
            document.getElementById("videoDescription").value.trim();

        const keywords = videoKeywords
            ? videoKeywords.value
                .split(/[,،]/)
                .map(keyword => keyword.trim())
                .filter(keyword => keyword.length > 0)
                .join(", ")
            : "";

        const categoryId = videoCategory.value;

        const duration = Number(
            document.getElementById("videoDuration").value
        ) || 0;

        const videoUrl = document.getElementById("videoUrl").value.trim();

        const coverFile = videoCover?.files?.[0] || null;

        if (!title || !categoryId || !videoUrl) {

            throw new Error("يرجى ملء الحقول المطلوبة.");
        }

        const parsedUrl = new URL(videoUrl);

        if (
            parsedUrl.protocol !== "https:" &&
            parsedUrl.protocol !== "http:"
        ) {

            throw new Error("رابط الفيديو غير صالح.");
        }

        const publishMode =
            document.getElementById("publishMode").value;

        const scheduledAt =
            document.getElementById("scheduledAt").value;

        if (publishMode === "scheduled" && !scheduledAt) {

            throw new Error("يرجى تحديد موعد النشر.");
        }

        if (
            publishMode === "scheduled" &&
            new Date(scheduledAt) <= new Date()
        ) {

            throw new Error("يجب اختيار موعد في المستقبل.");
        }

        /* التحقق من الصورة المختارة */

        const coverValidationError = validateCoverFile(coverFile);

        if (coverValidationError) {
            throw new Error(coverValidationError);
        }

        /* الاحتفاظ بالصورة القديمة ما لم يتم اختيار صورة جديدة */

        let coverUrl = editingVideo?.cover_image_url || null;

        /* رفع الصورة الجديدة عند اختيارها */

        if (coverFile) {

            saveVideoButton.textContent = "جارٍ رفع صورة الغلاف...";

            coverUrl = await uploadCoverImage(coverFile);
        }

        saveVideoButton.textContent = "جارٍ حفظ الفيديو...";

        const videoData = {

            title,
            description,

            keywords,

            category_id: categoryId,
            duration_seconds: duration,

            cover_image_url: coverUrl,
            external_video_url: videoUrl,

            status: publishMode === "scheduled"
                ? "scheduled"
                : "approved",

            scheduled_at: publishMode === "scheduled"
                ? new Date(scheduledAt).toISOString()
                : null,

            published_at: publishMode === "immediate"
                ? new Date().toISOString()
                : null
        };

        /* الحفاظ على حالة الفيديو الأصلية عند تعديل بياناته */

        if (id && editingVideo) {

            videoData.status = editingVideo.status;

            videoData.scheduled_at =
                editingVideo.status === "scheduled" && scheduledAt
                    ? new Date(scheduledAt).toISOString()
                    : editingVideo.scheduled_at || null;

            videoData.published_at =
                editingVideo.published_at || null;
        }

        if (id) {

            const { error } = await supabaseClient
                .from("videos")
                .update(videoData)
                .eq("id", id);

            if (error) throw error;

            showMessage(
                "تم تعديل بيانات الفيديو وحفظ صورة الغلاف والكلمات المفتاحية.",
                true
            );

        } else {

            videoData.uploader_id = currentUser.id;

            const { error } = await supabaseClient
                .from("videos")
                .insert(videoData);

            if (error) throw error;

            showMessage(
                "تمت إضافة الفيديو وصورة الغلاف بنجاح.",
                true
            );
        }

        resetVideoForm();

        await loadAdminVideos();

        await loadAdminStats();

    } catch (error) {

        console.error("Save Video Error:", error);

        showMessage("تعذر حفظ الفيديو: " + error.message);

    } finally {

        saveVideoButton.disabled = false;

        saveVideoButton.textContent = editingVideo
            ? "حفظ التعديلات"
            : "حفظ الفيديو";
    }
});


/* =================================
   إعادة ضبط النموذج
================================= */

function resetVideoForm() {

    editingVideo = null;

    videoForm.reset();

    document.getElementById("videoId").value = "";

    formHeading.textContent = "إضافة فيديو جديد";

    saveVideoButton.textContent = "حفظ الفيديو";

    cancelEditButton.style.display = "none";

    if (videoCover) {
        videoCover.value = "";
    }

    hideCoverPreview();

    const scheduleGroup =
        document.getElementById("scheduleDateGroup");

    if (scheduleGroup) {
        scheduleGroup.style.display = "none";
    }
}


/* =================================
   إلغاء التعديل
================================= */

cancelEditButton.addEventListener("click", () => {

    resetVideoForm();

    hideMessage();
});


/* =================================
   تحويل التاريخ إلى صيغة datetime-local
================================= */

function toLocalDateTime(value) {

    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const offset = date.getTimezoneOffset() * 60000;

    return new Date(date.getTime() - offset)
        .toISOString()
        .slice(0, 16);
}


/* =================================
   تعديل بيانات فيديو
================================= */

function editVideo(video) {

    editingVideo = video;

    document.getElementById("videoId").value = video.id;

    document.getElementById("videoTitle").value =
        video.title || "";

    document.getElementById("videoDescription").value =
        video.description || "";

    document.getElementById("videoCategory").value =
        video.category_id || "";

    document.getElementById("videoDuration").value =
        video.duration_seconds || "";

    /* حقل الصورة أصبح اختيار ملف وليس رابطاً */

    if (videoCover) {
        videoCover.value = "";
    }

    releaseCoverPreviewUrl();

    if (video.cover_image_url) {

        showCoverPreview(
            video.cover_image_url,
            "الصورة الحالية للفيديو"
        );

    } else {

        hideCoverPreview();
    }

    document.getElementById("videoUrl").value =
        video.external_video_url || "";

    if (videoKeywords) {
        videoKeywords.value = video.keywords || "";
    }

    /* استرجاع إعدادات الجدولة */

    const publishMode = document.getElementById("publishMode");

    const scheduledAt = document.getElementById("scheduledAt");

    const scheduleGroup =
        document.getElementById("scheduleDateGroup");

    if (video.status === "scheduled" && video.scheduled_at) {

        publishMode.value = "scheduled";

        scheduledAt.value = toLocalDateTime(video.scheduled_at);

        if (scheduleGroup) {
            scheduleGroup.style.display = "block";
        }

    } else {

        publishMode.value = "immediate";

        scheduledAt.value = "";

        if (scheduleGroup) {
            scheduleGroup.style.display = "none";
        }
    }

    formHeading.textContent = "تعديل بيانات الفيديو";

    saveVideoButton.textContent = "حفظ التعديلات";

    cancelEditButton.style.display = "inline-block";

    hideMessage();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =================================
   تحميل فيديوهات الإدارة
================================= */

async function loadAdminVideos() {

    adminVideos.innerHTML =
        '<div class="admin-empty">جارٍ التحميل...</div>';

    try {

        let allVideos = [];
        let offset = 0;

        const pageSize = 1000;

        while (true) {

            const { data, error } = await supabaseClient
                .from("videos")
                .select(`
                    id,
                    title,
                    description,
                    keywords,
                    category_id,
                    external_video_url,
                    cover_image_url,
                    duration_seconds,
                    views_count,
                    status,
                    created_at,
                    scheduled_at,
                    published_at
                `)
                .eq("status", currentStatus)
                .order("created_at", { ascending: false })
                .range(offset, offset + pageSize - 1);

            if (error) throw error;

            const batch = data || [];

            allVideos.push(...batch);

            if (batch.length < pageSize) {
                break;
            }

            offset += pageSize;
        }

        renderAdminVideos(allVideos);

    } catch (error) {

        console.error("Admin Videos Error:", error);

        adminVideos.textContent =
            "تعذر تحميل الفيديوهات: " + error.message;
    }
}


/* =================================
   عرض الفيديوهات
================================= */

function renderAdminVideos(videos) {

    adminVideos.innerHTML = "";

    if (!videos.length) {

        const empty = document.createElement("div");

        empty.className = "admin-empty";

        empty.textContent = "لا توجد فيديوهات في هذا القسم.";

        adminVideos.appendChild(empty);

        return;
    }

    videos.forEach(video => {

        const card = document.createElement("article");

        card.className = "admin-video-card";

        const image = document.createElement("img");

        if (video.cover_image_url) {

            image.src = video.cover_image_url;
            image.alt = video.title || "فيديو";

            image.addEventListener("error", () => {
                image.style.display = "none";
            });

        } else {

            image.style.display = "none";
        }

        const content = document.createElement("div");

        const title = document.createElement("h3");

        title.textContent = video.title || "بدون عنوان";

        const description = document.createElement("p");

        description.textContent =
            video.description || "لا يوجد وصف.";

        const status = document.createElement("p");

        status.textContent = "الحالة: " + video.status;

        const keywordsElement = document.createElement("p");

        keywordsElement.textContent = video.keywords
            ? "الكلمات المفتاحية: " + video.keywords
            : "لا توجد كلمات مفتاحية.";

        keywordsElement.style.color = "#ff9800";

        const actions = document.createElement("div");

        actions.className = "admin-actions";

        /* معلومات الجدولة */

        if (
            video.status === "scheduled" &&
            video.scheduled_at
        ) {

            const scheduleInfo = document.createElement("p");

            scheduleInfo.textContent =
                "موعد النشر: " +
                new Date(video.scheduled_at).toLocaleString("ar");

            scheduleInfo.style.color = "#ff9800";

            content.appendChild(scheduleInfo);
        }

        /* زر التعديل */

        const editButton = document.createElement("button");

        editButton.className = "edit-button";
        editButton.textContent = "تعديل";

        editButton.addEventListener("click", () => {
            editVideo(video);
        });

        actions.appendChild(editButton);

        /* أزرار القبول والرفض */

        if (video.status === "pending") {

            const approveButton = document.createElement("button");

            approveButton.className = "approve-button";
            approveButton.textContent = "قبول ونشر";

            approveButton.addEventListener("click", () => {
                changeVideoStatus(video, "approved");
            });

            const rejectButton = document.createElement("button");

            rejectButton.className = "reject-button";
            rejectButton.textContent = "رفض";

            rejectButton.addEventListener("click", () => {
                changeVideoStatus(video, "rejected");
            });

            actions.append(approveButton, rejectButton);
        }

        /* زر الحذف */

        const deleteButton = document.createElement("button");

        deleteButton.className = "delete-button";
        deleteButton.textContent = "حذف";

        deleteButton.addEventListener("click", () => {
            deleteVideo(video);
        });

        actions.appendChild(deleteButton);

        /* تغيير حالة الفيديوهات المنشورة والمرفوضة */

        if (
            video.status === "approved" ||
            video.status === "rejected"
        ) {

            const statusButton = document.createElement("button");

            statusButton.className = "edit-button";

            statusButton.textContent =
                video.status === "approved"
                    ? "رفض الفيديو"
                    : "نشر الفيديو";

            statusButton.addEventListener("click", async () => {

                const newStatus =
                    video.status === "approved"
                        ? "rejected"
                        : "approved";

                if (!confirm("هل تريد تغيير حالة الفيديو؟")) return;

                try {

                    const { error } = await supabaseClient
                        .from("videos")
                        .update({
                            status: newStatus,
                            published_at: newStatus === "approved"
                                ? new Date().toISOString()
                                : null
                        })
                        .eq("id", video.id);

                    if (error) throw error;

                    await loadAdminVideos();

                    await loadAdminStats();

                    showMessage(
                        "تم تغيير حالة الفيديو بنجاح.",
                        true
                    );

                } catch (error) {

                    console.error(error);

                    showMessage(
                        "تعذر تغيير حالة الفيديو: " + error.message
                    );
                }
            });

            actions.appendChild(statusButton);
        }

        content.append(
            title,
            description,
            keywordsElement,
            status,
            actions
        );

        card.append(image, content);

        adminVideos.appendChild(card);
    });
}


/* =================================
   قبول أو رفض فيديو
================================= */

async function changeVideoStatus(video, newStatus) {

    const action = newStatus === "approved"
        ? "قبول ونشر"
        : "رفض";

    if (!confirm(`هل تريد ${action} هذا الفيديو؟`)) return;

    try {

        const { error } = await supabaseClient
            .from("videos")
            .update({
                status: newStatus,
                published_at: newStatus === "approved"
                    ? new Date().toISOString()
                    : null
            })
            .eq("id", video.id);

        if (error) throw error;

        const { error: reviewError } = await supabaseClient
            .from("video_reviews")
            .insert({
                video_id: video.id,
                reviewer_id: currentUser.id,
                decision: newStatus
            });

        if (reviewError) {
            console.error("Review Log Error:", reviewError);
        }

        await loadAdminVideos();

        await loadAdminStats();

        showMessage(
            newStatus === "approved"
                ? "تم قبول الفيديو ونشره."
                : "تم رفض الفيديو.",
            true
        );

    } catch (error) {

        console.error(error);

        showMessage("تعذر تحديث حالة الفيديو: " + error.message);
    }
}


/* =================================
   حذف فيديو
================================= */

async function deleteVideo(video) {

    if (!confirm("هل أنت متأكد من حذف هذا الفيديو نهائياً؟")) {
        return;
    }

    try {

        const { error } = await supabaseClient
            .from("videos")
            .delete()
            .eq("id", video.id);

        if (error) throw error;

        await loadAdminVideos();

        await loadAdminStats();

        showMessage("تم حذف الفيديو.", true);

    } catch (error) {

        console.error(error);

        showMessage("تعذر حذف الفيديو: " + error.message);
    }
}


/* =================================
   أزرار تصفية الفيديوهات
================================= */

document.querySelectorAll(".admin-tabs button").forEach(button => {

    button.addEventListener("click", async () => {

        document.querySelectorAll(".admin-tabs button")
            .forEach(item => item.classList.remove("active"));

        button.classList.add("active");

        currentStatus = button.dataset.status;

        await loadAdminVideos();
    });
});


/* =================================
   تشغيل لوحة الإدارة
================================= */

async function initializeAdmin() {

    const allowed = await checkAdminAccess();

    if (!allowed) return;

    try {

        await loadAdminCategories();

        await loadAdminVideos();

        await loadAdminStats();

    } catch (error) {

        console.error("Admin Initialization Error:", error);

        showMessage(
            "حدث خطأ أثناء تجهيز لوحة الإدارة: " + error.message
        );
    }
}


/* =================================
   INITIALIZE
================================= */

initializeAdmin();
