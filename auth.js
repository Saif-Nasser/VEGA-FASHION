

async function loginWithGoogle() {
    try {
        console.log("Starting Google login...");

        if (typeof firebase === 'undefined' || !window.auth || !window.googleProvider) {
            console.error("Firebase Auth not initialized correctly");
            throw new Error("Authentication service not fully loaded. Please refresh the page.");
        }

        // Add persistence to ensure session stays
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;

        console.log("Google login successful:", user.email);

        const isNewUser = result.additionalUserInfo.isNewUser;

        if (isNewUser) {
            try {
                await db.collection('users').doc(user.uid).set({
                    email: user.email,
                    name: user.displayName,
                    photoURL: user.photoURL,
                    provider: 'google',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    orders: [],
                    wishlist: [],
                    lastLogin: new Date().toISOString()
                });
                console.log("New Google user document created");
            } catch (firestoreError) {
                console.warn("Could not create Firestore document:", firestoreError);
            }
        } else {
            try {
                await db.collection('users').doc(user.uid).update({
                    lastLogin: new Date().toISOString()
                });
            } catch (firestoreError) {
                console.warn("Could not update last login:", firestoreError);
            }
        }

        const isAdmin = await isUserAdminByUid(user.uid);
        return { success: true, user: user, isAdmin: isAdmin };

    } catch (error) {
        console.error("Google login error:", error);

        let errorMessage = "Failed to sign in with Google. Please try again.";

        if (error.code === 'auth/popup-blocked') {
            errorMessage = "Popup was blocked by your browser. Please allow popups for this site.";
        } else if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = "Sign-in was cancelled.";
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = "Network error. Please check your internet connection.";
        } else if (error.code === 'auth/unauthorized-domain') {
            errorMessage = "This domain is not authorized for Google Sign-In. Please add it in Firebase Console > Authentication > Settings > Authorized Domains.";
        } else if (error.code === 'auth/cancelled-popup-request') {
            errorMessage = "Only one popup can be open at a time.";
        }

        return { success: false, error: errorMessage, debug: error };
    }
}

async function loginWithFacebook() {
    try {
        console.log("Starting Facebook login...");

        if (typeof firebase === 'undefined' || !window.auth || !window.facebookProvider) {
            console.error("Firebase Auth not initialized correctly");
            throw new Error("Authentication service not fully loaded. Please refresh the page.");
        }

        // Add persistence
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

        const result = await auth.signInWithPopup(facebookProvider);
        const user = result.user;
        const credential = result.credential;

        console.log("Facebook login successful:", user.email);

        const isNewUser = result.additionalUserInfo.isNewUser;

        if (isNewUser) {
            try {
                await db.collection('users').doc(user.uid).set({
                    email: user.email,
                    name: user.displayName,
                    photoURL: user.photoURL,
                    provider: 'facebook',
                    facebookId: result.additionalUserInfo.profile.id,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    orders: [],
                    wishlist: [],
                    lastLogin: new Date().toISOString()
                });
                console.log("New Facebook user document created");
            } catch (firestoreError) {
                console.warn("Could not create Firestore document:", firestoreError);
            }
        } else {
            try {
                await db.collection('users').doc(user.uid).update({
                    lastLogin: new Date().toISOString()
                });
            } catch (firestoreError) {
                console.warn("Could not update last login:", firestoreError);
            }
        }

        const isAdmin = await isUserAdminByUid(user.uid);
        return { success: true, user: user, isAdmin: isAdmin };

    } catch (error) {
        console.error("Facebook login error:", error);

        let errorMessage = "Failed to sign in with Facebook. Please try again.";

        if (error.code === 'auth/popup-blocked') {
            errorMessage = "Popup was blocked by your browser. Please allow popups for this site.";
        } else if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = "Sign-in was cancelled.";
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = "Network error. Please check your internet connection.";
        } else if (error.code === 'auth/unauthorized-domain') {
            errorMessage = "This domain is not authorized for Facebook Sign-In. Please add it in Firebase Console > Authentication > Settings > Authorized Domains.";
        } else if (error.code === 'auth/account-exists-with-different-credential') {
            errorMessage = "An account already exists with the same email address but different sign-in credentials. Please use email/password to sign in.";
        }

        return { success: false, error: errorMessage, debug: error };
    }
}

window.loginWithGoogle = loginWithGoogle;
window.loginWithFacebook = loginWithFacebook;

async function signUp(email, password, name) {
    try {
        console.log("Attempting to sign up:", email);

        if (typeof firebase === 'undefined' || !window.auth) {
            console.error("Firebase Auth not initialized correctly during signup");
            throw new Error("Authentication service not fully loaded. Please refresh the page.");
        }

        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        console.log("User created:", userCredential.user.uid);

        await userCredential.user.updateProfile({
            displayName: name
        });
        console.log("Profile updated with name:", name);

        try {
            await db.collection('users').doc(userCredential.user.uid).set({
                email: email,
                name: name,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                orders: [],
                wishlist: [],
                lastLogin: new Date().toISOString()
            });
            console.log("User document created in Firestore");
        } catch (firestoreError) {
            console.warn("Firestore document creation failed, but user was created:", firestoreError);
            // We don't throw here because the auth part succeeded
        }

        return { success: true, user: userCredential.user };

    } catch (error) {
        console.error("Sign up error details:", error);

        let errorMessage = "An unexpected error occurred. Please try again.";

        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "This email is already registered. Please try logging in.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "Please enter a valid email address.";
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = "Email/password accounts are not enabled in Firebase Console. Please contact support.";
        } else if (error.code === 'auth/weak-password') {
            errorMessage = "Password is too weak. Please use at least 6 characters.";
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = "Network error. Please check your internet connection.";
        } else if (error.message && error.message.includes('Authentication service not fully loaded')) {
            errorMessage = error.message;
        }

        return { success: false, error: errorMessage, debug: error };
    }
}

// Admins are now managed server-side. The client checks an `admins` doc
// which contains an array `uids` of admin user UIDs. Use the Firebase Admin SDK
// (scripts/set_custom_claims.js / promote_user_to_admin.js) to add/remove admins.

async function isUserAdminByUid(uid) {
    try {
        const adminDoc = await db.collection('config').doc('admins').get();
        if (!adminDoc.exists) return false;
        const data = adminDoc.data();

        // 1. Check if UID is in the authorized list
        if (Array.isArray(data.uids) && data.uids.includes(uid)) return true;

        // 2. Check if current user email matches the master admin email
        if (data.masterEmail && auth.currentUser && auth.currentUser.email &&
            auth.currentUser.email.toLowerCase() === data.masterEmail.toLowerCase()) {
            return true;
        }

        return false;
    } catch (error) {
        console.warn('Could not fetch admin list:', error);
        return false;
    }
}

async function logIn(email, password) {
    try {
        console.log("Attempting to log in:", email);

        if (typeof firebase === 'undefined' || !window.auth) {
            console.error("Firebase Auth not initialized correctly during login");
            throw new Error("Authentication service not fully loaded. Please refresh the page.");
        }

        // Add persistence
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;
        const isAdmin = await isUserAdminByUid(uid);
        if (isAdmin) console.log("Admin logged in:", email);

        console.log("User logged in:", uid);

        try {
            await db.collection('users').doc(uid).update({
                lastLogin: new Date().toISOString()
            });
        } catch (firestoreError) {
            console.warn("Could not update last login timestamp:", firestoreError);
        }

        // Attach admin flag to return user object for convenience
        userCredential.user.isAdmin = isAdmin;
        return { success: true, user: userCredential.user };

    } catch (error) {
        console.error("Login error details:", error);

        // Provide a helpful, user-facing message but keep the raw error logged for debugging
        let errorMessage = "An unexpected error occurred. Please try again.";

        if (error && error.code === 'auth/user-not-found') {
            errorMessage = "No account found with this email. Please sign up first.";
        } else if (error && error.code === 'auth/wrong-password') {
            errorMessage = "Incorrect password. Please try again.";
        } else if (error && error.code === 'auth/invalid-email') {
            errorMessage = "Please enter a valid email address.";
        } else if (error && error.code === 'auth/user-disabled') {
            errorMessage = "This account has been disabled. Please contact support.";
        } else if (error && error.code === 'auth/network-request-failed') {
            errorMessage = "Network error. Please check your internet connection.";
        } else if (error && error.message && error.message.includes('Authentication service not fully loaded')) {
            errorMessage = error.message;
        } else if (error && error.message) {
            // If the error message contains a JSON payload (some backend or proxy responses do), try to parse it
            try {
                if (typeof error.message === 'string' && error.message.trim().startsWith('{')) {
                    const parsed = JSON.parse(error.message);
                    if (parsed && parsed.error && parsed.error.message) {
                        const apiMsg = parsed.error.message;
                        if (apiMsg === 'INVALID_LOGIN_CREDENTIALS' || /INVALID_?LOGIN|INVALID_CREDENTIALS|invalid login/i.test(apiMsg)) {
                            errorMessage = "Incorrect email or password. Please check your credentials and try again.";
                        } else {
                            errorMessage = `Authentication failed: ${apiMsg}. Check credentials and Firebase configuration.`;
                        }
                    } else {
                        errorMessage = `An unexpected error occurred: ${error.message}`;
                    }
                } else if (error && error.error && typeof error.error === 'object' && error.error.message) {
                    const apiMsg = error.error.message;
                    errorMessage = `Authentication failed: ${apiMsg}. Check credentials and Firebase configuration.`;
                } else {
                    errorMessage = `An unexpected error occurred: ${error.message}`;
                }
            } catch (parseErr) {
                console.warn('Could not parse error message as JSON', parseErr);
                errorMessage = `An unexpected error occurred: ${error.message}`;
            }
        }

        // Build richer debug info for the console and diagnostics UI
        const debugInfo = { raw: error, message: error && error.message };
        try {
            if (typeof error.message === 'string' && error.message.trim().startsWith('{')) {
                debugInfo.parsed = JSON.parse(error.message);
            }
        } catch (e) {
            // ignore parse failures
        }

        // Return structured debug info so the UI can log it for investigation
        return { success: false, error: errorMessage, debug: debugInfo };
    }
}

async function logOut() {
    try {
        console.log("Attempting to log out...");

        if (!window.auth) {
            console.warn("Firebase auth not available, performing local logout");

            localStorage.removeItem('vegaUser');
            localStorage.removeItem('vegaCart');
            return { success: true };
        }

        await auth.signOut();
        console.log("Firebase logout successful");

        localStorage.removeItem('vegaUser');
        localStorage.removeItem('vegaCart');

        return { success: true };

    } catch (error) {
        console.error("Logout error:", error);

        localStorage.removeItem('vegaUser');
        localStorage.removeItem('vegaCart');

        return {
            success: false,
            error: "Failed to log out from server, but local session was cleared."
        };
    }
}

async function resetPassword(email) {
    try {
        await auth.sendPasswordResetEmail(email);
        return { success: true };
    } catch (error) {
        console.error("Password reset error:", error);

        let errorMessage = "Failed to send reset email. Please try again.";

        if (error.code === 'auth/user-not-found') {
            errorMessage = "No account found with this email.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "Please enter a valid email address.";
        }

        return { success: false, error: errorMessage };
    }
}

function initAuthPage() {
    console.log("Initializing auth page...");

    function showErrorOnPage(message) {
        let errorElement = document.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.style.cssText = `
                padding: 12px;
                background: #ffebee;
                color: #c62828;
                border-radius: 8px;
                margin: 15px 0;
                text-align: center;
                animation: fadeIn 0.3s ease;
            `;
            const forms = document.querySelectorAll('.auth-form');
            if (forms.length > 0) forms[0].prepend(errorElement);
        }
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => { errorElement.style.display = 'none'; }, 5000);
    }

    // Social login buttons (Google/Facebook)
    const googleLoginBtn = document.querySelector('.social-btn.google');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const originalHTML = googleLoginBtn.innerHTML;
            googleLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
            googleLoginBtn.disabled = true;

            const result = await loginWithGoogle();

            if (result.success) {
                googleLoginBtn.innerHTML = '<i class="fas fa-check"></i> Success!';
                googleLoginBtn.style.backgroundColor = '#4CAF50';

                setTimeout(() => { window.location.href = result.isAdmin ? 'admin.html' : 'index.html'; }, 1000);
            } else {
                showErrorOnPage(result.error);
                googleLoginBtn.innerHTML = originalHTML;
                googleLoginBtn.disabled = false;
            }
        });
    }

    const facebookLoginBtn = document.querySelector('.social-btn.facebook');
    if (facebookLoginBtn) {
        facebookLoginBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const originalHTML = facebookLoginBtn.innerHTML;
            facebookLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
            facebookLoginBtn.disabled = true;

            const result = await loginWithFacebook();

            if (result.success) {
                facebookLoginBtn.innerHTML = '<i class="fas fa-check"></i> Success!';
                facebookLoginBtn.style.backgroundColor = '#4CAF50';
                setTimeout(() => { window.location.href = result.isAdmin ? 'admin.html' : 'index.html'; }, 1000);
            } else {
                showErrorOnPage(result.error);
                facebookLoginBtn.innerHTML = originalHTML;
                facebookLoginBtn.disabled = false;
            }
        });
    }

    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const submitBtn = loginForm.querySelector('.submit-btn');
            const originalHTML = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            submitBtn.disabled = true;

            try {
                const result = await logIn(email, password);
                if (result.success) {
                    submitBtn.innerHTML = '<i class="fas fa-check"></i> Welcome!';
                    submitBtn.style.backgroundColor = '#4CAF50';
                    setTimeout(() => { window.location.href = result.user.isAdmin ? 'admin.html' : 'index.html'; }, 800);
                } else {
                    // Show the friendly message, and log debug details to console for investigation
                    showErrorOnPage(result.error || 'An unexpected error occurred. Please try again.');
                    if (result && result.debug) console.debug('Login debug:', result.debug);

                    // If it's likely an admin provisioning issue, show a hint
                    const hintEl = document.querySelector('.auth-form .admin-hint');
                    if (hintEl && /No account found|admin/i.test(result.error || '')) {
                        hintEl.style.display = 'block';
                    }

                    submitBtn.innerHTML = originalHTML;
                    submitBtn.disabled = false;
                }
            } catch (err) {
                console.error('Unexpected error:', err);
                showErrorOnPage('An unexpected error occurred. Please try again.');
                submitBtn.innerHTML = originalHTML;
                submitBtn.disabled = false;
            }
        });
    }

    // Signup handler
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        const passwordInput = document.getElementById('signupPassword');
        if (passwordInput) passwordInput.addEventListener('input', updatePasswordStrength);

        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (!name || !email || !password || !confirmPassword) {
                showErrorOnPage('Please fill in all fields');
                return;
            }

            if (password !== confirmPassword) {
                showErrorOnPage("Passwords don't match");
                return;
            }

            try {
                const result = await signUp(email, password, name);
                if (result.success) {
                    window.location.href = 'index.html';
                } else {
                    showErrorOnPage(result.error);
                }
            } catch (err) {
                console.error('Signup error:', err);
                showErrorOnPage('Could not sign up. Please try again.');
            }
        });
    }

    // Reset password button
    const resetBtn = document.getElementById('resetPasswordBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            const email = document.getElementById('loginEmail').value.trim();
            if (!email) { showErrorOnPage('Please enter your email address to reset password.'); return; }
            const res = await resetPassword(email);
            const resetMessage = document.getElementById('resetMessage');
            if (res.success) {
                if (resetMessage) { resetMessage.textContent = 'Password reset email sent.'; resetMessage.style.display = 'block'; }
            } else {
                showErrorOnPage(res.error);
            }
        });
    }
}




document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', () => {
        const input = button.parentElement.querySelector('input');
        const icon = button.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
});

document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (typeof showToast === 'function') showToast('Social login requires additional Firebase setup. Please use email signup.', 'info'); else showTempMessage && showTempMessage('Social login requires additional Firebase setup. Please use email signup.');
    });
});

console.log("Auth page initialized successfully");

function showError(form, message) {
    const errorElement = form.querySelector('.error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';

        form.classList.add('shake');
        setTimeout(() => {
            form.classList.remove('shake');
        }, 500);
    }
}

function updatePasswordStrength(e) {
    const password = e.target.value;
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');

    if (!strengthBar || !strengthText) return;

    let strength = 0;
    let color = '#ff6b6b';
    let text = 'Weak';

    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength >= 4) {
        color = '#4CAF50';
        text = 'Strong';
    } else if (strength >= 2) {
        color = '#ffa726';
        text = 'Fair';
    }

    strengthBar.style.background = color;
    strengthText.textContent = text;
    strengthText.style.color = color;
}

function initAuthStateListener() {
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged(async (user) => {
            console.log("Auth state changed:", user ? "User logged in" : "No user");

            await updateAuthUI(user);

            try {
                if (user) {

                    localStorage.setItem('vegaUser', JSON.stringify({ uid: user.uid, email: user.email }));

                    if (localStorage.getItem('vegaGuest') === 'true') localStorage.removeItem('vegaGuest');
                } else {
                    localStorage.removeItem('vegaUser');
                }
            } catch (e) {
                console.warn('Could not update localStorage vegaUser flag', e);
            }

            if (user && (window.location.pathname.includes('login.html') ||
                window.location.pathname.includes('signup.html'))) {
                console.log("User already logged in, redirecting to home page");
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 500);
            }

            if (window.location.pathname.includes('profile.html')) {
                if (!user) {
                    console.log("No user on profile page, redirecting to login");
                    window.location.href = 'login.html';
                }
            }
        });
    }
}

async function updateAuthUI(user) {

    if (user && window.location.pathname.includes('profile.html')) {
        const userNameElement = document.getElementById('profileUserName');
        const userEmailElement = document.getElementById('profileUserEmail');
        const currentUserEmailElement = document.getElementById('currentUserEmail');

        if (userNameElement) {
            userNameElement.textContent = user.displayName || user.email.split('@')[0];
        }

        if (userEmailElement) {
            userEmailElement.textContent = user.email;
        }

        if (currentUserEmailElement) {
            currentUserEmailElement.textContent = user.email;
        }
    }

    await updateNavAuthState(user);
}

async function updateNavAuthState(user) {
    const profileLinks = document.querySelectorAll('a[href*="profile"], .nav-link[href*="profile"], .bottom-nav-link[href*="profile"]');
    const adminNavLink = document.getElementById('adminNavLink');
    const adminBottomNavLink = document.getElementById('adminBottomNavLink');

    if (user) {
        // Handle admin link visibility
        try {
            const isAdmin = await isUserAdminByUid(user.uid);
            if (isAdmin) {
                if (adminNavLink) adminNavLink.style.display = 'block';
                if (adminBottomNavLink) adminBottomNavLink.style.display = 'flex';
            } else {
                if (adminNavLink) adminNavLink.style.display = 'none';
                if (adminBottomNavLink) adminBottomNavLink.style.display = 'none';
            }
        } catch (e) {
            console.error("Error checking admin status for UI:", e);
        }

        profileLinks.forEach(link => {
            if (link.innerHTML.includes('Login') || link.innerHTML.includes('Sign')) {
                link.innerHTML = link.innerHTML.replace('Login', 'Profile')
                    .replace('Sign', 'Profile')
                    .replace('fa-sign-in-alt', 'fa-user')
                    .replace('fa-user-plus', 'fa-user');
            }
        });
    } else {
        // Reset/Hide Admin UI when logged out
        if (adminNavLink) adminNavLink.style.display = 'none';
        if (adminBottomNavLink) adminBottomNavLink.style.display = 'none';

        profileLinks.forEach(link => {
            if (link.innerHTML.includes('Profile')) {
                link.innerHTML = link.innerHTML.replace('Profile', 'Login')
                    .replace('fa-user', 'fa-sign-in-alt');
                if (link.getAttribute('href') === 'profile.html') {
                    link.setAttribute('href', 'login.html');
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing auth...");

    if (typeof firebase === 'undefined') {
        console.error("Firebase SDK not loaded!");
        showFirebaseError();
        return;
    }

    initAuthStateListener();

    // Improved detection: Check for existence of auth forms in the DOM
    // This works regardless of URL (e.g. clean URLs, different casing)
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const resetWrapper = document.getElementById('resetPasswordBtn');

    if (loginForm || signupForm || resetWrapper || document.querySelector('.auth-page')) {
        console.log("Auth elements detected, initializing page logic...");
        setTimeout(() => {
            initAuthPage();
        }, 100);
    }
});

function showFirebaseError() {
    const forms = document.querySelectorAll('.auth-form');
    forms.forEach(form => {
        const errorElement = form.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = "Authentication service is not available. Please check your Firebase configuration.";
            errorElement.style.display = 'block';
        }
    });
}

window.signUp = signUp;
window.logIn = logIn;
window.logOut = logOut;
window.resetPassword = resetPassword;

document.addEventListener('DOMContentLoaded', function () {
    const continueGuestBtn = document.getElementById('continueGuestBtn');
    if (continueGuestBtn) {
        continueGuestBtn.addEventListener('click', function () {

            localStorage.setItem('vegaGuest', 'true');

            const params = new URLSearchParams(window.location.search);
            let redirect = params.get('redirect');

            if (!redirect) {
                window.location.href = 'index.html';
                return;
            }

            const token = redirect.toString().trim().toLowerCase();

            const tokenMap = {
                'home': 'index.html',
                'index': 'index.html',
                'shop': 'shop.html',
                'new': 'new-arrivals.html',
                'new-arrivals': 'new-arrivals.html',
                'collections': 'collections.html',
                'checkout': 'index.html',
                'profile': 'profile.html',
                'cart': 'index.html'
            };

            if (tokenMap[token]) {
                const target = tokenMap[token];
                window.location.href = target;
                return;
            }

            try {

                // Prevent redirecting to external URLs for safety
                if (/^https?:\/\//i.test(redirect) || /^\/\//.test(redirect)) {
                    window.location.href = 'index.html';
                    return;
                }

                if (redirect.endsWith('.html')) {
                    window.location.href = redirect;
                    return;
                }

                window.location.href = redirect + '.html';
            } catch (e) {
                window.location.href = 'index.html';
            }
        });
    }
});
