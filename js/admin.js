/* =================================
   XCITY - ADMIN PANEL
================================= */

const videoForm = document.getElementById("videoForm");
const adminVideos = document.getElementById("adminVideos");
const adminCategories = document.getElementById("adminCategories");
const videoCategory = document.getElementById("videoCategory");

const formMessage = document.getElementById("formMessage");
const formHeading = document.getElementById("formHeading");

const saveVideoButton = document.getElementById("saveVideoButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const logoutButton = document.getElementById("logoutButton");

let currentUser = null;
let currentStatus = "pending";
let categories = [];

// =================================
// المظهر
// =================================

const themeToggle = document.getElementById("themeToggle");

if (localStorage.getItem("xcity-theme") === "light") {
    document.body.classList.add("light-mode");
}

if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("light-mode");

        localStorage.setItem(
            "xcity-theme",
            document.body.classList.contains("light-mode")
                ? "light"
                : "dark"
        );
    });
}

// =================================
// رسائل لوحة الإدارة
// =================================

function showMessage(message, success = false) {

    formMessage.textContent = message;
    formMessage.style.display = "block";

    formMessage.style.background = success
        ? "#164b31"
        : "#642525";

    formMessage.style.color = "#fff";
}

function hideMessage() {
    formMessage.style.display = "none";
}

// =================================
// التحقق من المدير
// =================================

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

// =================================
// تسجيل الخروج
// =================================

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

// =================================
// تحميل التصنيفات
// =================================

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

// =================================
// عرض التصنيفات
// =================================

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

                showMessage("تعذر تحديث التصنيف: " + error.message);
            }
        });

        actions.append(editButton, toggleButton);
        row.append(name, actions);

        adminCategories.appendChild(row);
    });
}

// =================================
// حفظ فيديو جديد أو تعديل فيديو
// =================================

videoForm.addEventListener("submit", async event => {

    event.preventDefault();

    hideMessage();

    saveVideoButton.disabled = true;

    try {

        const id = document.getElementById("videoId").value;

        const title = document.getElementById("videoTitle").value.trim();
        const description = document.getElementById("videoDescription").value.trim();
        const categoryId = videoCategory.value;

        const duration = Number(
            document.getElementById("videoDuration").value
        ) || 0;

        const cover = document.getElementById("videoCover").value.trim();
        const videoUrl = document.getElementById("videoUrl").value.trim();

        if (!title || !categoryId || !videoUrl) {
            throw new Error("يرجى ملء الحقول المطلوبة.");
        }

        const parsedUrl = new URL(videoUrl);

        if (parsedUrl.protocol !== "https:" &&
            parsedUrl.protocol !== "http:") {
            throw new Error("رابط الفيديو غير صالح.");
        }

        const publishMode = document.getElementById("publishMode").value;
const scheduledAt = document.getElementById("scheduledAt").value;

if (publishMode === "scheduled" && !scheduledAt) {
    showMessage("يرجى تحديد موعد النشر.");
    saveVideoButton.disabled = false;
    return;
}

if (publishMode === "scheduled" && new Date(scheduledAt) <= new Date()) {
    showMessage("يجب اختيار موعد في المستقبل.");
    saveVideoButton.disabled = false;
    return;
}
const videoData = {
    title,
    description,
    category_id: categoryId,
    duration_seconds: duration,
    cover_image_url: cover || null,
    external_video_url: videoUrl,
    status: publishMode === "scheduled" ? "scheduled" : "approved",
    scheduled_at: publishMode === "scheduled"
        ? new Date(scheduledAt).toISOString()
        : null,
    published_at: publishMode === "immediate"
        ? new Date().toISOString()
        : null
};

        if (id) {

            const { error } = await supabaseClient
                .from("videos")
                .update(videoData)
                .eq("id", id);

            if (error) throw error;

            showMessage("تم تعديل بيانات الفيديو.", true);

       } else {

    videoData.uploader_id = currentUser.id;

    const { error } = await supabaseClient
        .from("videos")
        .insert(videoData);

            if (error) throw error;

            showMessage("تمت إضافة الفيديو بنجاح.", true);
        }

        resetVideoForm();

        await loadAdminVideos();

    } catch (error) {

        console.error("Save Video Error:", error);

        showMessage("تعذر حفظ الفيديو: " + error.message);

    } finally {

        saveVideoButton.disabled = false;
    }
});

// =================================
// إعادة ضبط النموذج
// =================================

function resetVideoForm() {

    videoForm.reset();

    document.getElementById("videoId").value = "";

    formHeading.textContent = "إضافة فيديو جديد";

    saveVideoButton.textContent = "حفظ الفيديو";

    cancelEditButton.style.display = "none";
}

// =================================
// إلغاء التعديل
// =================================

cancelEditButton.addEventListener("click", () => {

    resetVideoForm();
    hideMessage();
});

// =================================
// تعديل بيانات فيديو
// =================================

function editVideo(video) {

    document.getElementById("videoId").value = video.id;
    document.getElementById("videoTitle").value = video.title || "";
    document.getElementById("videoDescription").value = video.description || "";
    document.getElementById("videoCategory").value = video.category_id || "";
    document.getElementById("videoDuration").value = video.duration_seconds || "";
    document.getElementById("videoCover").value = video.cover_image_url || "";
    document.getElementById("videoUrl").value = video.external_video_url || "";

    formHeading.textContent = "تعديل بيانات الفيديو";

    saveVideoButton.textContent = "حفظ التعديلات";

    cancelEditButton.style.display = "inline-block";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// =================================
// تحميل فيديوهات الإدارة
// =================================

async function loadAdminVideos() {

    adminVideos.innerHTML =
        '<div class="admin-empty">جارٍ التحميل...</div>';

    try {

        const { data, error } = await supabaseClient
            .from("videos")
            .select(`
                id,
                title,
                description,
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
            .order("created_at", { ascending: false });

        if (error) throw error;

        renderAdminVideos(data || []);

    } catch (error) {

        console.error(error);

        adminVideos.textContent =
            "تعذر تحميل الفيديوهات: " + error.message;
    }
}

// =================================
// عرض الفيديوهات
// =================================

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

        image.src = video.cover_image_url || "";
        image.alt = video.title || "فيديو";

        image.addEventListener("error", () => {
            image.style.display = "none";
        });

        const content = document.createElement("div");

        const title = document.createElement("h3");

        title.textContent = video.title;

        const description = document.createElement("p");

        description.textContent = video.description || "لا يوجد وصف.";

        const status = document.createElement("p");

        status.textContent = "الحالة: " + video.status;
if (video.status === "scheduled" && video.scheduled_at) {
    const scheduleInfo = document.createElement("p");

    scheduleInfo.textContent =
        "موعد النشر: " +
        new Date(video.scheduled_at).toLocaleString("ar");

    scheduleInfo.style.color = "#ff9800";

    card.appendChild(scheduleInfo);
}
        const actions = document.createElement("div");

        actions.className = "admin-actions";

        const editButton = document.createElement("button");

        editButton.className = "edit-button";
        editButton.textContent = "تعديل";

        editButton.addEventListener("click", () => {
            editVideo(video);
        });

        actions.appendChild(editButton);

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

        const deleteButton = document.createElement("button");

        deleteButton.className = "delete-button";
        deleteButton.textContent = "حذف";

        deleteButton.addEventListener("click", () => {
            deleteVideo(video);
        });

        actions.appendChild(deleteButton);
const statusButton = document.createElement("button");

statusButton.className = "edit-button";
statusButton.textContent =
    video.status === "approved" ? "رفض الفيديو" : "نشر الفيديو";

statusButton.addEventListener("click", async () => {

    const newStatus =
        video.status === "approved" ? "rejected" : "approved";

    const { error } = await supabaseClient
        .from("videos")
        .update({ status: newStatus })
        .eq("id", video.id);

    if (error) {
        alert("حدث خطأ أثناء تغيير حالة الفيديو.");
        console.error(error);
        return;
    }

    alert("تم تغيير حالة الفيديو بنجاح.");

    loadVideos();
});

actions.appendChild(statusButton);
        content.append(title, description, status, actions);

        card.append(image, content);

        adminVideos.appendChild(card);
    });
}

// =================================
// قبول أو رفض فيديو
// =================================

async function changeVideoStatus(video, newStatus) {

    const action = newStatus === "approved"
        ? "قبول ونشر"
        : "رفض";

    if (!confirm(`هل تريد ${action} هذا الفيديو؟`)) return;

    try {

        const { error } = await supabaseClient
            .from("videos")
            .update({ status: newStatus })
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

// =================================
// حذف فيديو
// =================================

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

        showMessage("تم حذف الفيديو.", true);

    } catch (error) {

        console.error(error);

        showMessage("تعذر حذف الفيديو: " + error.message);
    }
}

// =================================
// أزرار تصفية الفيديوهات
// =================================

document.querySelectorAll(".admin-tabs button").forEach(button => {

    button.addEventListener("click", async () => {

        document.querySelectorAll(".admin-tabs button")
            .forEach(item => item.classList.remove("active"));

        button.classList.add("active");

        currentStatus = button.dataset.status;

        await loadAdminVideos();
    });
});

// =================================
// تشغيل لوحة الإدارة
// =================================

async function initializeAdmin() {

    const allowed = await checkAdminAccess();

    if (!allowed) return;

    try {

        await loadAdminCategories();

        await loadAdminVideos();

    } catch (error) {

        console.error("Admin Initialization Error:", error);

        showMessage("حدث خطأ أثناء تجهيز لوحة الإدارة: " + error.message);
    }
}

initializeAdmin();