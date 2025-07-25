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

// Route to create new student session
app.post('/create-student', (req, res) => {
  const studentId = 'student_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  studentTexts[studentId] = '';
  studentList.push({
    id: studentId,
    name: req.body.name || `Student ${studentList.length + 1}`,
    joinTime: new Date().toISOString()
  });
  
  res.json({ studentId, redirectUrl: `/student.html?id=${studentId}` });
});

// Route to get all students (for teacher)
app.get('/students', (req, res) => {
  const studentsWithText = studentList.map(student => ({
    ...student,
    currentText: studentTexts[student.id] || ''
  }));
  res.json(studentsWithText);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle student text updates
  socket.on('student_text_update', (data) => {
    const { studentId, text } = data;
    if (studentTexts.hasOwnProperty(studentId)) {
      studentTexts[studentId] = text;
      // Broadcast to all connected clients (especially teachers)
      io.emit('text_updated', { studentId, text });
    }
  });

  // When teacher joins, send all current student data
  socket.on('teacher_join', () => {
    const studentsWithText = studentList.map(student => ({
      ...student,
      currentText: studentTexts[student.id] || ''
    }));
    socket.emit('all_students_data', studentsWithText);
  });

  // When student joins, send their current text
  socket.on('student_join', (studentId) => {
    if (studentTexts.hasOwnProperty(studentId)) {
      socket.emit('student_current_text', {
        studentId,
        text: studentTexts[studentId]
      });
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