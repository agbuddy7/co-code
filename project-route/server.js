const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Store text for each student dynamically
let studentTexts = {};
let studentList = [];

// Store active classroom sessions
let classroomSessions = {};
// Structure: { classCode: { teacherId, students: [], createdAt, isActive, problemStatement: null } }

// Route to create new teacher session and generate class code
app.post('/create-teacher', (req, res) => {
  const classCode = generateClassCode();
  const teacherId = 'teacher_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  classroomSessions[classCode] = {
    teacherId: teacherId,
    students: [],
    createdAt: new Date().toISOString(),
    isActive: true,
    problemStatement: null
  };
  
  res.json({ 
    teacherId, 
    classCode, 
    redirectUrl: `/teacher.html?code=${classCode}&teacherId=${teacherId}` 
  });
});

// Route to create new student session
app.post('/create-student', (req, res) => {
  const { name, classCode } = req.body;
  
  // Verify class code exists and is active
  if (!classCode || !classroomSessions[classCode] || !classroomSessions[classCode].isActive) {
    return res.status(400).json({ error: 'Invalid or expired class code' });
  }
  
  const studentId = 'student_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  studentTexts[studentId] = '';
  
  const studentData = {
    id: studentId,
    name: name || `Student ${classroomSessions[classCode].students.length + 1}`,
    joinTime: new Date().toISOString(),
    classCode: classCode,
    status: 'working' // working, done, error
  };
  
  classroomSessions[classCode].students.push(studentData);
  studentList.push(studentData);
  
  res.json({ 
    studentId, 
    classCode,
    redirectUrl: `/student.html?id=${studentId}&code=${classCode}` 
  });
});

// Route to get all students for a specific class (for teacher)
app.get('/students/:classCode', (req, res) => {
  const { classCode } = req.params;
  
  if (!classroomSessions[classCode]) {
    return res.status(404).json({ error: 'Class not found' });
  }
  
  const studentsWithText = classroomSessions[classCode].students.map(student => ({
    ...student,
    currentText: studentTexts[student.id] || ''
  }));
  
  res.json(studentsWithText);
});

// Route to set problem statement for a class
app.post('/set-problem/:classCode', (req, res) => {
  const { classCode } = req.params;
  const { problemStatement, teacherId } = req.body;
  
  if (!classroomSessions[classCode]) {
    return res.status(404).json({ error: 'Class not found' });
  }
  
  if (classroomSessions[classCode].teacherId !== teacherId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  classroomSessions[classCode].problemStatement = problemStatement;
  
  res.json({ success: true });
});

// Route to get problem statement for a class
app.get('/problem/:classCode', (req, res) => {
  const { classCode } = req.params;
  
  if (!classroomSessions[classCode]) {
    return res.status(404).json({ error: 'Class not found' });
  }
  
  res.json({ 
    problemStatement: classroomSessions[classCode].problemStatement 
  });
});

// Route to update student status
app.post('/update-status/:classCode/:studentId', (req, res) => {
  const { classCode, studentId } = req.params;
  const { status } = req.body;
  
  if (!classroomSessions[classCode]) {
    return res.status(404).json({ error: 'Class not found' });
  }
  
  const student = classroomSessions[classCode].students.find(s => s.id === studentId);
  if (student) {
    student.status = status;
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Student not found' });
  }
});

// Function to generate a unique 6-digit class code
function generateClassCode() {
  let code;
  do {
    code = Math.random().toString(36).substr(2, 6).toUpperCase();
  } while (classroomSessions[code]); // Ensure uniqueness
  return code;
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle student text updates
  socket.on('student_text_update', (data) => {
    const { studentId, text, classCode } = data;
    if (studentTexts.hasOwnProperty(studentId) && classroomSessions[classCode]) {
      studentTexts[studentId] = text;
      // Broadcast to all connected clients in the same class (especially teachers)
      io.emit('text_updated', { studentId, text, classCode });
    }
  });

  // When teacher joins, send all current student data for their class
  socket.on('teacher_join', (classCode) => {
    if (classroomSessions[classCode]) {
      const studentsWithText = classroomSessions[classCode].students.map(student => ({
        ...student,
        currentText: studentTexts[student.id] || ''
      }));
      socket.emit('all_students_data', { 
        classCode, 
        students: studentsWithText,
        problemStatement: classroomSessions[classCode].problemStatement 
      });
    }
  });

  // When student joins, send their current text and problem statement
  socket.on('student_join', (data) => {
    const { studentId, classCode } = data;
    if (studentTexts.hasOwnProperty(studentId) && classroomSessions[classCode]) {
      socket.emit('student_current_text', {
        studentId,
        text: studentTexts[studentId],
        classCode,
        problemStatement: classroomSessions[classCode].problemStatement
      });
    }
  });

  // Handle problem statement updates
  socket.on('problem_updated', (data) => {
    const { classCode, problemStatement } = data;
    if (classroomSessions[classCode]) {
      classroomSessions[classCode].problemStatement = problemStatement;
      // Broadcast to all students in the class
      io.emit('problem_statement_updated', { classCode, problemStatement });
    }
  });

  // Handle student status updates
  socket.on('student_status_update', (data) => {
    const { studentId, classCode, status } = data;
    if (classroomSessions[classCode]) {
      const student = classroomSessions[classCode].students.find(s => s.id === studentId);
      if (student) {
        student.status = status;
        // Broadcast to teacher
        io.emit('student_status_changed', { studentId, classCode, status });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});