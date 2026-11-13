/* =================================
   XCITY - AUTHENTICATION
================================= */

const accountButton = document.getElementById("accountButton");
const accountOverlay = document.getElementById("accountOverlay");
const closeAccountModal = document.getElementById("closeAccountModal");

const accountForm = document.getElementById("accountForm");
const accountEmail = document.getElementById("accountEmail");
const accountPassword = document.getElementById("accountPassword");

const accountFormTitle = document.getElementById("accountFormTitle");
const accountSubmit = document.getElementById("accountSubmit");

const accountSwitchText = document.getElementById("accountSwitchText");
const accountSwitchButton = document.getElementById("accountSwitchButton");

const accountMessage = document.getElementById("accountMessage");

const accountUserMenu = document.getElementById("accountUserMenu");
const accountUserEmail = document.getElementById("accountUserEmail");

const logoutAccountButton = document.getElementById("logoutAccountButton");
const adminMenuLink = document.getElementById("adminMenuLink");

let isRegisterMode = false;
let currentAccount = null;

// =================================
// رسائل الحساب
// =================================

function showAccountMessage(message, type = "error") {

    accountMessage.textContent = message;

    accountMessage.className =
        "account-message " + type;
}

function hideAccountMessage() {

    accountMessage.textContent = "";
    accountMessage.className = "account-message";
}

// =================================
// فتح وإغلاق النافذة
// =================================

accountButton.addEventListener("click", async () => {

    if (currentAccount) {

        accountUserMenu.classList.toggle("show");

        return;
    }

    accountUserMenu.classList.remove("show");

    accountOverlay.classList.add("show");

    hideAccountMessage();
});

closeAccountModal.addEventListener("click", () => {

    accountOverlay.classList.remove("show");

    hideAccountMessage();
});

accountOverlay.addEventListener("click", event => {

    if (event.target === accountOverlay) {

        accountOverlay.classList.remove("show");

        hideAccountMessage();
    }
});

// =================================
// التبديل بين الدخول والتسجيل
// =================================

accountSwitchButton.addEventListener("click", () => {

    isRegisterMode = !isRegisterMode;

    hideAccountMessage();

    if (isRegisterMode) {

        accountFormTitle.textContent = "إنشاء حساب جديد";

        accountSubmit.textContent = "إنشاء حساب";

        accountSwitchText.textContent = "لديك حساب بالفعل؟";

        accountSwitchButton.textContent = "تسجيل الدخول";

        accountPassword.autocomplete = "new-password";

    } else {

        accountFormTitle.textContent = "تسجيل الدخول";

        accountSubmit.textContent = "تسجيل الدخول";

        accountSwitchText.textContent = "ليس لديك حساب؟";

        accountSwitchButton.textContent = "إنشاء حساب";

        accountPassword.autocomplete = "current-password";
    }
});

// =================================
// تسجيل الدخول وإنشاء الحساب
// =================================

accountForm.addEventListener("submit", async event => {

    event.preventDefault();

    hideAccountMessage();

    const email = accountEmail.value.trim();
    const password = accountPassword.value;

    if (!email || !password) {

        showAccountMessage("يرجى إدخال البريد الإلكتروني وكلمة المرور.");

        return;
    }

    if (password.length < 8) {

        showAccountMessage("يجب ألا تقل كلمة المرور عن 8 أحرف.");

        return;
    }

    accountSubmit.disabled = true;

    accountSubmit.textContent = "يرجى الانتظار...";

    try {

        if (isRegisterMode) {

            // إنشاء حساب جديد

            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password
            });

            if (error) throw error;

            if (data.session) {

                showAccountMessage(
                    "تم إنشاء الحساب وتسجيل الدخول بنجاح.",
                    "success"
                );

                accountForm.reset();

                await updateAccountInterface(data.session.user);

                setTimeout(() => {
                    accountOverlay.classList.remove("show");
                }, 1500);

            } else {

                showAccountMessage(
                    "تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيده.",
                    "success"
                );
            }

        } else {

            // تسجيل الدخول

            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) throw error;

            showAccountMessage(
                "تم تسجيل الدخول بنجاح.",
                "success"
            );

            accountForm.reset();

            await updateAccountInterface(data.user);

            setTimeout(() => {
                accountOverlay.classList.remove("show");
            }, 1000);
        }

    } catch (error) {

        console.error("XCITY Authentication Error:", error);

        let message = "حدث خطأ أثناء تنفيذ العملية.";

        if (error.message.includes("Invalid login credentials")) {
            message = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
        } else if (error.message.includes("User already registered")) {
            message = "هذا البريد الإلكتروني مسجل مسبقاً.";
        } else if (error.message.includes("Email not confirmed")) {
            message = "يرجى تأكيد بريدك الإلكتروني أولاً.";
        } else if (error.message.includes("Password should be")) {
            message = "كلمة المرور لا تحقق شروط الأمان.";
        } else {
            message = error.message;
        }

        showAccountMessage(message);

    } finally {

        accountSubmit.disabled = false;

        accountSubmit.textContent = isRegisterMode
            ? "إنشاء حساب"
            : "تسجيل الدخول";
    }
});

// =================================
// تحديث واجهة الحساب
// =================================

async function updateAccountInterface(user) {

    currentAccount = user || null;

    if (!currentAccount) {

        accountButton.textContent = "♙";

        accountUserMenu.classList.remove("show");

        adminMenuLink.style.display = "none";

        return;
    }

    accountButton.textContent = "●";

    accountUserEmail.textContent = currentAccount.email || "";

    // التحقق من صلاحية المدير
    try {

        const { data, error } = await supabaseClient
            .rpc("is_xcity_admin");

        if (error) throw error;

        adminMenuLink.style.display =
            data === true ? "block" : "none";

    } catch (error) {

        console.error("Admin Check Error:", error);

        adminMenuLink.style.display = "none";
    }
}

// =================================
// تسجيل الخروج
// =================================

logoutAccountButton.addEventListener("click", async () => {

    const confirmed = confirm("هل تريد تسجيل الخروج؟");

    if (!confirmed) return;

    logoutAccountButton.disabled = true;

    try {

        const { error } = await supabaseClient.auth.signOut();

        if (error) throw error;

        currentAccount = null;

        accountUserMenu.classList.remove("show");

        adminMenuLink.style.display = "none";

        accountButton.textContent = "♙";

        alert("تم تسجيل الخروج بنجاح.");

    } catch (error) {

        console.error(error);

        alert("تعذر تسجيل الخروج: " + error.message);

    } finally {

        logoutAccountButton.disabled = false;
    }
});

// =================================
// متابعة حالة تسجيل الدخول
// =================================

async function initializeAccount() {

    try {

        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) throw error;

        await updateAccountInterface(
            data.session ? data.session.user : null
        );

    } catch (error) {

        console.error("Session Error:", error);
    }
}

initializeAccount();

supabaseClient.auth.onAuthStateChange((event, session) => {

    updateAccountInterface(
        session ? session.user : null
    );
});