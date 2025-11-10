// Demo Data Loader
// This script automatically populates localStorage with sample data if it's empty.
// Useful for demonstrations and testing.

(function() {
    // Check if data already exists to avoid overwriting
    if (localStorage.getItem('sesd_users')) {
        console.log("Demo Data: Existing data found. Skipping injection.");
        return;
    }

    console.log("Demo Data: Injecting sample data...");

    // --- 1. Users ---
    const users = [
        {
            id: 'user_prof1',
            fullName: 'Dr. Alan Grant',
            email: 'prof@sesd.edu',
            password: 'password123', // In a real app, hash this!
            role: 'professor',
            managedBatches: ['ALL'],
            createdAt: new Date().toISOString()
        },
        {
            id: 'user_student1',
            fullName: 'Ellie Sattler',
            email: 'student@sesd.edu',
            password: 'password123',
            role: 'student',
            batch: 'Batch-A',
            createdAt: new Date().toISOString()
        },
        {
            id: 'user_student2',
            fullName: 'Ian Malcolm',
            email: 'ian@sesd.edu',
            password: 'password123',
            role: 'student',
            batch: 'Batch-B',
            createdAt: new Date().toISOString()
        }
    ];

    // --- 2. Exams / Assessments ---
    const exams = [
        {
            id: 'exam_midterm_cs',
            creatorEmail: 'prof@sesd.edu',
            title: 'CS101 Midterm Exam',
            subject: 'Computer Science',
            duration: 45,
            type: 'exam',
            hasCertificate: false,
            isPrivate: false,
            assignedBatches: ['ALL'],
            questions: [
                { type: 'mcq', text: 'What does HTML stand for?', marks: 1, options: ['Hyper Text Markup Language', 'Home Tool Markup Language', 'Hyperlinks and Text Markup Language', 'Hyperlinking Text Marking Language'], correctOption: 0 },
                { type: 'mcq', text: 'Which property is used to change the background color?', marks: 1, options: ['color', 'bgcolor', 'background-color', 'bgColor'], correctOption: 2 },
                { type: 'code', text: 'Write a JavaScript function to add two numbers.', marks: 5 }
            ]
        },
        {
            id: 'quiz_math_basics',
            creatorEmail: 'prof@sesd.edu',
            title: 'Basic Math Quiz',
            subject: 'Mathematics',
            duration: 15,
            type: 'quiz',
            hasCertificate: false,
            isPrivate: false,
            assignedBatches: ['Batch-A'],
            questions: [
                { type: 'mcq', text: 'What is 2 + 2?', marks: 1, options: ['3', '4', '5', '22'], correctOption: 1 },
                { type: 'text', text: 'Explain the Pythagorean theorem.', marks: 3 }
            ]
        },
        {
            id: 'assign_final_project',
            creatorEmail: 'prof@sesd.edu',
            title: 'Final Web Project',
            subject: 'Certification Course',
            duration: 120,
            type: 'assignment',
            hasCertificate: true, // This one gives a certificate!
            isPrivate: false,
            assignedBatches: ['ALL'],
            questions: [
                { type: 'text', text: 'Describe your project proposal.', marks: 10 },
                { type: 'file', text: 'Upload your project ZIP file.', marks: 90 }
            ]
        },
        {
            id: 'exam_private_cert',
            creatorEmail: 'prof@sesd.edu',
            title: 'Secret Certification Exam',
            subject: 'Special Topic',
            duration: 60,
            type: 'exam',
            hasCertificate: true,
            isPrivate: true,
            accessCode: 'SECRET', // Code to join
            questions: [
                 { type: 'mcq', text: 'Is this a private exam?', marks: 5, options: ['Yes', 'No'], correctOption: 0 }
            ]
        }
    ];

    // --- 3. Results (Sample history) ---
    const results = [
        {
            resultId: 'res_1',
            examId: 'quiz_math_basics',
            studentEmail: 'student@sesd.edu',
            studentName: 'Ellie Sattler',
            score: 4,
            totalMarks: 4,
            dateTaken: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
            status: 'completed',
            answers: { 0: 1, 1: 'a^2 + b^2 = c^2' },
            needsGrading: false
        }
    ];

    // Save to localStorage
    localStorage.setItem('sesd_users', JSON.stringify(users));
    localStorage.setItem('sesd_exams', JSON.stringify(exams));
    localStorage.setItem('sesd_results', JSON.stringify(results));

    console.log("Demo Data: Injection complete.");
})();