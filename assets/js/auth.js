function setAuthRole(role) {
    const studentBtn = document.querySelector('[data-role="student"]');
    const professorBtn = document.querySelector('[data-role="professor"]');
    const pill = document.getElementById('rolePill');
    const hiddenInput = document.getElementById('selectedRole');
    const studentBatchGroup = document.getElementById('studentBatchGroup');
    const profBatchGroup = document.getElementById('profBatchGroup');

    if (!studentBtn || !professorBtn || !pill || !hiddenInput) return;

    if (role === 'student') {
        studentBtn.classList.add('active');
        professorBtn.classList.remove('active');
        pill.style.transform = 'translateX(0)';
        hiddenInput.value = 'student';
        if(studentBatchGroup) studentBatchGroup.style.display = 'block';
        if(profBatchGroup) profBatchGroup.style.display = 'none';
    } else {
        professorBtn.classList.add('active');
        studentBtn.classList.remove('active');
        pill.style.transform = 'translateX(100%)';
        hiddenInput.value = 'professor';
        if(studentBatchGroup) studentBatchGroup.style.display = 'none';
        if(profBatchGroup) profBatchGroup.style.display = 'block';
    }
}

function handleSignup(event) {
    event.preventDefault();

    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value.toLowerCase().trim();
    const password = document.getElementById('password').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    const role = document.getElementById('selectedRole').value;

    if (password !== confirmPass) { alert("Passwords do not match!"); return; }
    if (password.length < 6) { alert("Password must be at least 6 characters long."); return; }

    const allUsers = JSON.parse(localStorage.getItem('sesd_users')) || [];
    if (allUsers.some(u => u.email === email)) { alert("An account with this email already exists."); return; }

    const newUser = {
        id: 'user_' + Date.now(),
        fullName, email, password, role,
        createdAt: new Date().toISOString()
    };

    if (role === 'student') {
        newUser.batch = document.getElementById('studentBatch').value;
    } else {
        const batchInput = document.getElementById('profBatches').value.trim();
        newUser.managedBatches = batchInput ? batchInput.split(',').map(b => b.trim()) : ['ALL'];
    }

    allUsers.push(newUser);
    localStorage.setItem('sesd_users', JSON.stringify(allUsers));

    alert("Account created successfully! Please log in.");
    window.location.href = 'login.html';
}

function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value.toLowerCase().trim();
    const password = document.getElementById('password').value;
    const role = document.getElementById('selectedRole').value;

    const allUsers = JSON.parse(localStorage.getItem('sesd_users')) || [];
    const user = allUsers.find(u => u.email === email && u.password === password && u.role === role);

    if (user) {
        const sessionUser = { ...user };
        delete sessionUser.password;
        localStorage.setItem('sesd_currentUser', JSON.stringify(sessionUser));

        if (role === 'student') window.location.href = 'student/dashboard.html';
        else window.location.href = 'professor/dashboard.html';
    } else {
        alert("Invalid credentials or wrong role selected.");
    }
}

function handleLogout() {
    if(confirm("Are you sure you want to log out?")) {
        localStorage.removeItem('sesd_currentUser');
        if (window.location.pathname.includes('/student/') || window.location.pathname.includes('/professor/')) {
            window.location.href = '../index.html';
        } else {
            window.location.href = 'index.html';
        }
    }
}

(function checkAuthProtection() {
    const path = window.location.pathname;
    if (path.includes('/student/') || path.includes('/professor/')) {
        const user = JSON.parse(localStorage.getItem('sesd_currentUser'));
        if (!user) {
            window.location.href = '../login.html';
        } else {
            if (path.includes('/student/') && user.role !== 'student') {
                window.location.href = '../professor/dashboard.html';
            } else if (path.includes('/professor/') && user.role !== 'professor') {
                window.location.href = '../student/dashboard.html';
            }
        }
    }
})();