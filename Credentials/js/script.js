async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

//LocalStorage keys
const USERS_KEY = 'modernLoginSystemUsers';
const SETTINGS_KEY = 'modernLoginSystemSettings';

//Get users from localstorage or empty arrays
function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}

//save users to local storage
function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

//get settings from localstorage or defaults
function getSettings() {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {
        themeColor: '#8e44ad',
        soundOn: true,
        musicVolume: 0.2,
        confettiOn: true
    };
}

//save settings
function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

//validate email format
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase());
}

//validate username (no spaces,min 3 char)
function validateUsername(username) {
    return /^[a-zA-Z0-9_]{3,}$/.test(username);
}

//password stength checker (return 0-100)
function passwordStength(password) {
    let score = 0;
    if (password.length >= 8) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password)) score += 25;
    return score;
}

//Real-time registration validation
async function validateRegisterForm() {
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    const users = getUsers();

    let valid = true;


//username validation
const usernameInput = document.getElementById('username');
const usernameError = usernameInput.nextElementSibling;
if(!validateUsername(username)) {
    usernameError.textContent = 'Username must be at least 3 characters, no spaces.';
    usernameError.classList.add('visible');
    valid = false;
} else if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    usernameError.textContent = 'Username already taken.';
    usernameError.classList.add('visible');
    valid = false;
} else {
    usernameError.classList.remove('visible');
}

//Email validation
const emailInput = document.getElementById('email');
const emailError = emailInput.nextElementSibling;
if (!validateEmail(email)) {
    emailError.textContent = 'Invalid email format.';
    emailError.classList.add('visible');
    valid = false;
} else if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    emailError.textContent = 'Email already registered.';
    emailError.classList.add('visible');
    valid = false;
} else {
    emailError.classList.remove('visible');
}

//pasword validation
const passwordInput = document.getElementById('password');
const passwordError = passwordInput.nextElementSibling;
const strength = passwordStength(password);
const strengthProgress = document.querySelector('#password-strength progress');
strengthProgress.value = strength;

if (strength < 50) {
    passwordError.textContent = 'Password too weak.';
    passwordError.classList.add('visible');
    valid = false;
} else {
    passwordError.classList.remove('visible');
}

//confirm password
const confirmInput = document.getElementById('confirmPassword');
const confirmError = confirmInput.nextElementSibling;
if (password !== confirmPassword) {
    confirmError.textContent = 'Passwords do not match.';
    confirmError.classList.add('visible');
}else {
    confirmError.classList.remove('visible');
}

return valid;

}

//Registration submission
document.getElementById('registerForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const valid = await validateRegisterForm();
    if (!valid) return;

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const hashedPassword = await hashPassword(password);

    const users = getUsers();
    users.push({ username, email, password: hashedPassword });
    saveUsers(users);

    alert('Registration successful! Redirecting to login...');
    window.location.href = 'index.html';
});

//login validation and submission
document.getElementById('loginform')?.addEventListener('submit', async e => {
    e.preventDefault();

    const loginInput = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const hashedPassword = await hashPassword(password);
    const users = getUsers();

    const user = users.find(
        u =>
        (u.email.toLowerCase() === loginInput.toLowerCase()||
         u.username.toLowerCase() === loginInput.toLowerCase()) &&
        u.password === hashedPassword
    );

    if (!user) {
        alert('Invalid username/email or password.');
        return;
    }

    localStorage.setItem('loggedInUser', JSON.stringify(user));
    window.location.href = '../admin.html';
    return;
});




//logout
document.getElementById('logoutBtn')?.addEventListener('click', e => {
    e.preventDefault();
    localStorage.removeItem('loggedInUser');
    window.location.href = 'index.html';
});

//dropdown
document.getElementById('userDropdownBtn')?.addEventListener('click', () => {
    document.getElementById('userDropdownContent').classList.toggle('show');
});

//close dropdown
window.onclick = function(event) {
    if (!event.target.matches('#userDropDownBtn')) {
        const dropdown = document.getElementById('userDropdownContent');
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show')
        }
    }
}