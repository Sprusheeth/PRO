// EXAM ENGINE: Handles listing exams, test-taking, PROCTORING & SECURITY

let currentExam = null;
let currentQuestionIndex = 0;
let userAnswers = {}; 
let timerInterval = null;
let timeRemaining = 0;
let isExamActive = false;

document.addEventListener("DOMContentLoaded", () => {
    const currentUser = JSON.parse(localStorage.getItem('sesd_currentUser'));
    if (!currentUser || currentUser.role !== 'student') {
         if (window.location.pathname.includes('student/exams.html')) {
            window.location.href = '../login.html';
         }
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const examIdToStart = urlParams.get('start');

    if (examIdToStart) {
        startExam(examIdToStart);
    } else {
        // Only load list if we are NOT trying to start an exam immediately
        if (document.getElementById('exam-list-view')) {
            loadExamLists(currentUser);
        }
    }

    document.getElementById('nextBtn').addEventListener('click', () => navigateQuestion(1));
    document.getElementById('prevBtn').addEventListener('click', () => navigateQuestion(-1));
    document.getElementById('submitExamBtn').addEventListener('click', () => submitExam('completed'));

    document.addEventListener("visibilitychange", () => {
        if (document.hidden && isExamActive) {
            isExamActive = false;
            clearInterval(timerInterval);
            alert("⚠️ VIOLATION DETECTED ⚠️\n\nYou switched tabs during a proctored exam.\nYour assessment will be automatically submitted and flagged.");
            submitExam('flagged');
        }
    });
});

function enableSecurity() {
    document.addEventListener('contextmenu', blockEvent);
    document.addEventListener('copy', blockEvent);
    document.addEventListener('cut', blockEvent);
    document.addEventListener('paste', blockEvent);
    enterFullScreen();
}

function disableSecurity() {
    document.removeEventListener('contextmenu', blockEvent);
    document.removeEventListener('copy', blockEvent);
    document.removeEventListener('cut', blockEvent);
    document.removeEventListener('paste', blockEvent);
    if (document.exitFullscreen) document.exitFullscreen().catch(e => {});
}

function blockEvent(e) {
    if (isExamActive) {
        e.preventDefault();
        return false;
    }
}

// --- UPDATED LIST LOADER (Available ONLY) ---
function loadExamLists(user) {
    const allExams = JSON.parse(localStorage.getItem('sesd_exams')) || [];
    const allResults = JSON.parse(localStorage.getItem('sesd_results')) || [];
    const myResults = allResults.filter(r => r.studentEmail === user.email);
    
    const takenExamIds = new Set(myResults.filter(r => r.status !== 'retrying').map(r => r.examId));

    // Filter: Not private AND (assigned to ALL or user's batch)
    const myBatchExams = allExams.filter(exam => 
         (!exam.isPrivate && (exam.assignedBatches.includes('ALL') || exam.assignedBatches.includes(user.batch)))
    );

    const availableExams = myBatchExams.filter(exam => !takenExamIds.has(exam.id));
    const container = document.getElementById('availableExamsList');
    
    if (!container) return;
    container.innerHTML = '';

    if (availableExams.length === 0) {
        container.innerHTML = '<p class="empty-state">🎉 No assessments available right now.</p>';
        return;
    }

    const now = new Date();

    availableExams.forEach(exam => {
        // Check Schedule
        if (exam.startDate && new Date(exam.startDate) > now) return; // Not open yet
        if (exam.endDate && new Date(exam.endDate) < now) return;   // Already closed

        let typeBadge = `<span class="type-badge type-${exam.type || 'exam'}">${(exam.type || 'exam').toUpperCase()}</span>`;

        container.innerHTML += `
            <div class="exam-grid-card">
                <span class="exam-subject-badge">${exam.subject}</span>
                <h3>${typeBadge} ${exam.title}</h3>
                <p style="color: #64748b; margin-bottom: 1.5rem;">${exam.questions.length} Questions • ${exam.duration} Mins</p>
                <button onclick="startExam('${exam.id}')" class="btn btn-primary" style="margin-top: auto;">Start</button>
            </div>
        `;
    });

    if (container.innerHTML === '') {
         container.innerHTML = '<p class="empty-state">⏳ No assessments are currently open.</p>';
    }
}

// ==================== EXAM TAKING CORE ====================
function startExam(examId) {
    const allExams = JSON.parse(localStorage.getItem('sesd_exams')) || [];
    currentExam = allExams.find(e => e.id === examId);

    if (!currentExam) return;

    if(!confirm(`Ready to start "${currentExam.title}"?\n\nNote: Fullscreen will be enabled and switching tabs is prohibited.`)) {
         if(window.location.search.includes('start=')) window.location.href = 'exams.html';
         return;
    }

    isExamActive = true;
    enableSecurity();

    document.getElementById('exam-list-view').style.display = 'none';
    document.getElementById('exam-taking-view').style.display = 'block';
    document.querySelector('.navbar').style.display = 'none'; 

    currentQuestionIndex = 0;
    userAnswers = {};
    timeRemaining = currentExam.duration * 60;

    document.getElementById('activeExamTitle').innerText = currentExam.title;
    document.getElementById('activeExamSubject').innerText = currentExam.subject;
    document.getElementById('totalQNum').innerText = currentExam.questions.length;

    startTimer();
    renderQuestion();
}

function enterFullScreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) { elem.requestFullscreen().catch(err => console.log("Fullscreen denied")); }
}

function renderQuestion() {
    const q = currentExam.questions[currentQuestionIndex];
    document.getElementById('currentQNum').innerText = currentQuestionIndex + 1;
    document.getElementById('questionText').innerText = q.text;
    document.getElementById('questionPoints').innerText = `${q.marks} Pts`;

    const container = document.getElementById('optionsList');
    container.innerHTML = ''; 

    const answer = userAnswers[currentQuestionIndex] || '';

    switch(q.type) {
        case 'text':
            container.innerHTML = `<textarea id="textAnswer" class="form-input" rows="6" placeholder="Type your answer here..." oninput="saveTextAnswer(this.value)" style="font-family: inherit;">${answer}</textarea>`;
            break;
        case 'code':
             container.innerHTML = `<div style="background: #1e293b; padding: 10px; border-radius: 8px 8px 0 0; color: #94a3b8; font-size: 0.9rem;">Code Editor</div><textarea id="codeAnswer" class="form-input" rows="10" placeholder="// Write code here..." oninput="saveTextAnswer(this.value)" style="font-family: 'Courier New', monospace; background: #0f172a; color: #f8fafc; border-radius: 0 0 8px 8px;">${answer}</textarea>`;
            break;
        case 'file':
            container.innerHTML = `<div style="border: 2px dashed #cbd5e1; padding: 2rem; text-align: center; border-radius: 12px;"><p style="color: #64748b;">Upload solution file</p><input type="file" onchange="saveFileAnswer(this)"><p id="fileNameDisplay" style="margin-top: 1rem; font-weight: 600; color: #2563eb;">${answer ? 'Selected: ' + answer : ''}</p></div>`;
            break;
        case 'mcq':
        default:
            q.options.forEach((optionText, idx) => {
                const isChecked = (userAnswers[currentQuestionIndex] === idx) ? 'checked' : '';
                container.innerHTML += `<div><input type="radio" id="opt_${idx}" name="q_opts" class="option-input" ${isChecked} onchange="saveMcqAnswer(${idx})"><label for="opt_${idx}" class="option-label"><span class="option-custom-radio"></span>${optionText}</label></div>`;
            });
            break;
    }
    updateProgressBar();
    updateNavButtons();
}

function saveMcqAnswer(idx) { userAnswers[currentQuestionIndex] = idx; }
function saveTextAnswer(val) { userAnswers[currentQuestionIndex] = val; }
function saveFileAnswer(input) { if (input.files && input.files[0]) { userAnswers[currentQuestionIndex] = input.files[0].name; document.getElementById('fileNameDisplay').innerText = "Selected: " + input.files[0].name; } }

function submitExam(status = 'completed') {
    isExamActive = false; 
    clearInterval(timerInterval);
    disableSecurity(); 

    let score = 0;
    let totalMarks = 0;
    currentExam.questions.forEach((q, idx) => {
        totalMarks += q.marks;
        if (q.type === 'mcq' && userAnswers[idx] === q.correctOption) score += q.marks;
    });

    const currentUser = JSON.parse(localStorage.getItem('sesd_currentUser'));
    const allResults = JSON.parse(localStorage.getItem('sesd_results')) || [];
    
    allResults.push({
        resultId: 'res_' + Date.now(),
        examId: currentExam.id,
        studentEmail: currentUser.email,
        studentName: currentUser.fullName,
        score: (status === 'flagged') ? 0 : score,
        totalMarks: totalMarks,
        dateTaken: new Date().toISOString(),
        status: status,
        answers: userAnswers,
        needsGrading: currentExam.questions.some(q => q.type !== 'mcq') && status !== 'flagged'
    });

    localStorage.setItem('sesd_results', JSON.stringify(allResults));

    if (status === 'flagged') window.location.href = 'dashboard.html';
    else window.location.href = 'results.html';
}

function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        if (timeRemaining <= 0) submitExam('completed'); 
    }, 1000);
}
function updateTimerDisplay() {
    const m = Math.floor(timeRemaining / 60);
    const s = timeRemaining % 60;
    document.getElementById('examTimer').innerText = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}
function navigateQuestion(dir) { currentQuestionIndex += dir; renderQuestion(); }
function updateProgressBar() {
    document.getElementById('examProgress').style.width = `${((currentQuestionIndex + 1) / currentExam.questions.length) * 100}%`;
}
function updateNavButtons() {
    document.getElementById('prevBtn').disabled = currentQuestionIndex === 0;
    if (currentQuestionIndex === currentExam.questions.length - 1) {
        document.getElementById('nextBtn').style.display = 'none';
        document.getElementById('submitExamBtn').style.display = 'inline-flex';
    } else {
        document.getElementById('nextBtn').style.display = 'inline-flex';
        document.getElementById('submitExamBtn').style.display = 'none';
    }
}