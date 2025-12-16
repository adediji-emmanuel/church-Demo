document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const email = form.loginEmail.value.trim().toLowerCase();
        const password = form.loginPassword.trim();

        let valid = true;

        if(!validateEmail(email)) {
            showError('loginEmailError', 'Please enter a valid email.');
            valid = false;
        }

        if(password.length === 0) {
            showError('loginPasswordError', 'Password cannot be empty.');
            valid = false;
        }

        if(!valid) return;

        const hashedPassword = await hashPassword(password);

        if (hashedPassword !== users[email].password) {
            showError('loginPasswordError', 'Incorrect password.');
            return;
        }

        localStorage.setItem('loggedInUser', email);

        window.location.href = 'main.html';
    });

    function showError(id, message) {
        const errorspan = document.getElementById(id);
        errorspan.textContent = message;
        errorspan.classList.add('visible');
    }

    function clearErrors() {
        document.querySelectorAll('.error-msg').forEach((el) => {
            el.textContent = '';
            el.classList.remove('visibsle');
        });
    }

    function validateEmail(email) {
        const emailRegex = 
        /^[a-zA-ZO-9._%+-]+@[a-zA-ZO-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    }

    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    }
});