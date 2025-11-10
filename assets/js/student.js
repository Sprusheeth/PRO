document.addEventListener("DOMContentLoaded", () => {
    const currentUser = JSON.parse(localStorage.getItem('sesd_currentUser'));
    if (!currentUser || currentUser.role !== 'student') {
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = '../login.html';
        }
        return;
    }

    const path = window.location.pathname;
    if (path.includes('dashboard.html')) {
        initializeDashboard(currentUser);
    }
});

function initializeDashboard(user) {
    if(document.getElementById('studentName')) document.getElementById('studentName').textContent = user.fullName.split(' ')[0];
    if(document.getElementById('profileName')) document.getElementById('profileName').textContent = user.fullName;
    if(document.getElementById('profileEmail')) document.getElementById('profileEmail').textContent = user.email;
    if(document.getElementById('profileBatch')) document.getElementById('profileBatch').textContent = (user.batch === 'PRIVATE_CANDIDATE') ? 'Private' : user.batch;

    const allExams = JSON.parse(localStorage.getItem('sesd_exams')) || [];
    const allResults = JSON.parse(localStorage.getItem('sesd_results')) || [];
    const myResults = allResults.filter(r => r.studentEmail === user.email);
    
    const myBatchExams = allExams.filter(exam => !exam.isPrivate && (!exam.assignedBatches || exam.assignedBatches.includes('ALL') || exam.assignedBatches.includes(user.batch)));
    const takenIds = new Set(myResults.map(r => r.examId));
    const pending = myBatchExams.filter(e => !takenIds.has(e.id));

    updateStats(myResults, pending);
    renderAvailable(pending);
    renderRecentActivity(myResults, allExams);
    renderCertifications(myResults, allExams);
    drawPerformanceChart(myResults);
}

function updateStats(results, pending) {
    if(document.getElementById('examsTakenCount')) document.getElementById('examsTakenCount').textContent = results.length;
    if(document.getElementById('pendingExamsCount')) document.getElementById('pendingExamsCount').textContent = pending.length;
    if (results.length > 0) {
        const avg = Math.round(results.reduce((sum, r) => sum + ((r.score/r.totalMarks)*100), 0) / results.length);
        if(document.getElementById('averageScore')) document.getElementById('averageScore').textContent = avg + '%';
    } else {
        if(document.getElementById('averageScore')) document.getElementById('averageScore').textContent = "-";
    }
}

function renderAvailable(pending) {
    const container = document.getElementById('availableExamsList');
    if (!container) return;
    container.innerHTML = '';
    if (pending.length === 0) { container.innerHTML = '<div class="empty-state">🎉 Nothing due right now!</div>'; return; }

    const now = new Date();
    pending.filter(e => {
        if (e.startDate && new Date(e.startDate) > now) return false;
        if (e.endDate && new Date(e.endDate) < now) return false;
        return true;
    }).slice(0, 5).forEach(exam => {
        let typeBadge = `<span class="type-badge type-${exam.type || 'exam'}">${(exam.type || 'exam').toUpperCase()}</span>`;
        container.innerHTML += `<div class="exam-card"><div class="exam-info"><h4>${typeBadge} ${exam.title}</h4><p>${exam.subject} • ${exam.duration}m ${exam.hasCertificate ? '• 🏆 Cert' : ''}</p></div><a href="exams.html?start=${exam.id}" class="btn btn-primary btn-small">Start</a></div>`;
    });
}

function renderRecentActivity(myResults, allExams) {
    const listContainer = document.getElementById('recentActivityList');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    if (myResults.length === 0) { listContainer.innerHTML = '<div class="empty-state">No exams taken yet.</div>'; return; }
    const recent = [...myResults].sort((a, b) => new Date(b.dateTaken) - new Date(a.dateTaken)).slice(0, 3);
    recent.forEach(r => {
        const exam = allExams.find(e => e.id === r.examId) || { title: 'Unknown' };
        listContainer.innerHTML += `<div class="exam-card"><div class="exam-info"><h4>${exam.title}</h4><p>${new Date(r.dateTaken).toLocaleDateString()}</p></div><div class="exam-status status-completed">${r.score}/${r.totalMarks}</div></div>`;
    });
}

function renderCertifications(myResults, allExams) {
    const certSection = document.getElementById('certSection');
    const certList = document.getElementById('certList');
    if (!certSection || !certList) return;

    const earnedCerts = myResults.filter(r => {
        const exam = allExams.find(e => e.id === r.examId);
        return exam && exam.hasCertificate && (r.score / r.totalMarks >= 0.7);
    });

    if (earnedCerts.length > 0) {
        certSection.style.display = 'block';
        certList.innerHTML = '';
        earnedCerts.forEach(r => {
            const exam = allExams.find(e => e.id === r.examId);
            certList.innerHTML += `<div class="cert-card"><div class="cert-title">${exam.subject} Certification</div><p>${exam.title}</p><div class="cert-date">Issued: ${new Date(r.dateTaken).toLocaleDateString()}</div></div>`;
        });
    } else {
        certSection.style.display = 'none';
    }
}

function drawPerformanceChart(myResults) {
    const ctx = document.getElementById('performanceChart');
    if (!ctx || myResults.length === 0) return;
    const last5 = myResults.slice(-5);
    const labels = last5.map((_, i) => `Exam ${i + 1}`);
    const data = last5.map(r => (r.score / r.totalMarks) * 100);
    new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'Score (%)', data: data, borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.1)', fill: true, tension: 0.4 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100, ticks: { display: false } }, x: { ticks: { display: false } } }, plugins: { legend: { display: false } } }
    });
}

function joinPrivateExam() {
    const codeInput = document.getElementById('examCodeInput');
    const code = codeInput.value.trim().toUpperCase();
    if (!code) { alert("Please enter a code."); return; }
    const allExams = JSON.parse(localStorage.getItem('sesd_exams')) || [];
    const exam = allExams.find(e => e.isPrivate && e.accessCode === code);

    if (exam) {
        const user = JSON.parse(localStorage.getItem('sesd_currentUser'));
        const allResults = JSON.parse(localStorage.getItem('sesd_results')) || [];
        const alreadyTaken = allResults.some(r => r.examId === exam.id && r.studentEmail === user.email);
        if (alreadyTaken) { alert("You have already taken this private exam."); } 
        else if(confirm(`Found Exam: "${exam.title}"\nDo you want to start it now?`)) { window.location.href = `exams.html?start=${exam.id}`; }
    } else {
        alert("Invalid Exam Code.");
    }
}

function loadProfileData() {
    const user = JSON.parse(localStorage.getItem('sesd_currentUser'));
    if (!user) return;
    if(document.getElementById('editName')) document.getElementById('editName').value = user.fullName;
    if(document.getElementById('readOnlyEmail')) document.getElementById('readOnlyEmail').value = user.email;
    if(document.getElementById('readOnlyBatch')) document.getElementById('readOnlyBatch').value = user.batch;
}

function updateProfile(e) {
    e.preventDefault();
    const newName = document.getElementById('editName').value;
    const newPass = document.getElementById('newPassword').value;
    let allUsers = JSON.parse(localStorage.getItem('sesd_users')) || [];
    let currentUser = JSON.parse(localStorage.getItem('sesd_currentUser'));
    const userIdx = allUsers.findIndex(u => u.email === currentUser.email);
    if (userIdx !== -1) {
        allUsers[userIdx].fullName = newName;
        if (newPass && newPass.length >= 6) { allUsers[userIdx].password = newPass; } 
        else if (newPass && newPass.length < 6) { alert("Password must be at least 6 characters."); return; }
        localStorage.setItem('sesd_users', JSON.stringify(allUsers));
        currentUser.fullName = newName;
        localStorage.setItem('sesd_currentUser', JSON.stringify(currentUser));
        if (newPass) { alert("Password changed. Please log in again."); localStorage.removeItem('sesd_currentUser'); window.location.href = '../login.html'; } 
        else { alert("Profile updated successfully!"); location.reload(); }
    }
}

function loadStudentResults() {
    const user = JSON.parse(localStorage.getItem('sesd_currentUser'));
    if (!user) return;
    const allResults = JSON.parse(localStorage.getItem('sesd_results')) || [];
    const allExams = JSON.parse(localStorage.getItem('sesd_exams')) || [];
    const myResults = allResults.filter(r => r.studentEmail === user.email).sort((a, b) => new Date(b.dateTaken) - new Date(a.dateTaken));
    const container = document.getElementById('resultsList');
    if (!container) return;
    container.innerHTML = myResults.length === 0 ? '<div class="empty-state">You haven\'t taken any exams yet.</div>' : '';
    myResults.forEach(result => {
        const exam = allExams.find(e => e.id === result.examId) || { title: 'Unknown Exam', subject: 'N/A' };
        let statusBadge = `<span class="exam-status status-completed">Final Score: ${result.score} / ${result.totalMarks}</span>`;
        let cardStyle = '';
        if (result.status === 'flagged') { statusBadge = `<span style="background:#fee2e2; color:#991b1b; padding:4px 12px; border-radius:20px; font-weight:700;">⚠️ FLAGGED (Violation)</span>`; cardStyle = 'border-left: 4px solid #ef4444;'; } 
        else if (result.needsGrading) { statusBadge = `<span style="background:#fef3c7; color:#d97706; padding:4px 12px; border-radius:20px; font-weight:600;">⏳ Pending Grading (${result.score}/${result.totalMarks})</span>`; }
        const percentage = (!result.needsGrading && result.status !== 'flagged') ? Math.round((result.score / result.totalMarks) * 100) : 0;
        container.innerHTML += `<div class="exam-card" style="${cardStyle} display:block;"><div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:1rem;"><div><h3 style="margin-bottom:0.5rem;">${exam.title}</h3><p style="color:#64748b;">${exam.subject} • Taken on ${new Date(result.dateTaken).toLocaleDateString()}</p></div><div style="text-align:right;">${statusBadge}</div></div>${(!result.needsGrading && result.status !== 'flagged') ? `<div><div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:0.25rem; color:#64748b;"><span>Performance</span><span>${percentage}%</span></div><div class="progress-bar"><div class="progress-fill" style="width: ${percentage}%"></div></div></div>` : ''}<div style="margin-top: 1rem; text-align: right;"><button onclick="viewResultDetails('${result.resultId}')" class="btn btn-secondary btn-small" ${result.status === 'flagged' ? 'disabled' : ''}>View Details</button></div></div>`;
    });
}

function viewResultDetails(resultId) {
    const allResults = JSON.parse(localStorage.getItem('sesd_results')) || [];
    const allExams = JSON.parse(localStorage.getItem('sesd_exams')) || [];
    const result = allResults.find(r => r.resultId === resultId);
    if (!result) return;
    const exam = allExams.find(e => e.id === result.examId);
    document.getElementById('modalExamTitle').innerText = exam.title;
    document.getElementById('modalScore').innerText = `Score: ${result.score} / ${result.totalMarks}`;
    document.getElementById('modalDate').innerText = `Date: ${new Date(result.dateTaken).toLocaleDateString()}`;
    const container = document.getElementById('modalQuestionsList');
    container.innerHTML = '';
    exam.questions.forEach((q, idx) => {
        const userAnswer = result.answers[idx];
        let statusBadge = '';
        let answerDisplay = userAnswer || 'Skipped';
        if (q.type === 'mcq') {
            const isCorrect = (userAnswer === q.correctOption);
            statusBadge = isCorrect ? `<span class="result-badge badge-correct">Correct (+${q.marks})</span>` : `<span class="result-badge badge-incorrect">Incorrect (0/${q.marks})</span>`;
            answerDisplay = (userAnswer !== undefined && q.options[userAnswer]) ? q.options[userAnswer] : 'Skipped';
        } else {
            statusBadge = result.needsGrading ? `<span class="result-badge badge-pending">Pending Grading</span>` : `<span class="result-badge" style="background:#e2e8f0">Manually Graded</span>`;
        }
        container.innerHTML += `<div class="result-q-card"><p><strong>Q${idx+1}:</strong> ${q.text}</p><p style="margin-top:0.5rem; color:#64748b; font-size:0.9rem;">Your Answer:</p><div style="background:white; padding:0.8rem; border-radius:8px; border:1px solid #cbd5e1; margin-top:0.25rem;">${answerDisplay}</div><div style="margin-top:0.5rem;">${statusBadge}</div></div>`;
    });
    document.getElementById('resultDetailsModal').style.display = 'flex';
}

function closeResultModal() { document.getElementById('resultDetailsModal').style.display = 'none'; }