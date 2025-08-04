const express = require('express');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const cors = require('cors');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
require('dotenv').config();
const nodemailer = require('nodemailer');


const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(xss());
app.use(mongoSanitize());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: false },
}));
 
app.use((req, res, next) => {
  console.log(`IP: ${req.ip}, Method: ${req.method}, URL: ${req.originalUrl}`);
  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later."
});
app.use(limiter);

const mongoURI = 'mongodb://localhost:27017';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));


const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  age: { type: Number, required: false },
  role: { type: String, enum: ['student', 'teacher'], required: true },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

}, { timestamps: true });

const Course = mongoose.model('Course', courseSchema);

const enrollmentSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

const JWT_SECRET = process.env.JWT_SECRET;



// Middleware: JWT or Session authentication
function authenticate(req, res, next) {
  // Check session first
  if (req.session && req.session.userId) {
    req.user = { id: req.session.userId, role: req.session.role };
    return next();
  }
  // Check JWT
  const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = { id: decoded.id, role: decoded.role };
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }
  return res.status(401).json({ error: 'Authentication required' });
}

// Middleware: Role-based authorization
function authorize(roles = []) {
  return (req, res, next) => {
    if (!req.user || (roles.length && !roles.includes(req.user.role))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
// Login endpoint
app.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    // JWT
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true });
    // Session
    req.session.userId = user._id;
    req.session.role = user.role;
    res.json({ message: 'Login successful', token });
  } catch (err) {
    next(err);
  }
});

// Registration endpoint
app.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role, age } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role, age });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    next(err);
  }
});


app.post('/users', async (req, res, next) => {
  try {

    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email must be unique' });
    }
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

app.get('/users', async (req, res, next) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

app.put('/users/:id', async (req, res, next) => {
  try {
    if (req.body.email) {
      const existingUser = await User.findOne({ email: req.body.email, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email must be unique' });
      }
    }
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

app.delete('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
});

app.get('/students/:id/courses', authenticate, authorize(['student']), async (req, res, next) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const enrollments = await Enrollment.find({ student: student._id });
    const courses = await Course.find({ _id: { $in: enrollments.map(e => e.course) } });
    res.json({ student, courses });
  } catch (err) {
    next(err);
  }
});

app.get('/teachers/:id/courses', authenticate, authorize(['teacher']), async (req, res, next) => {
  try {
    const teacher = await User.findOne({ _id: req.params.id, role: 'teacher' });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    const courses = await Course.find({ teacher: teacher._id });
    res.json({ teacher, courses });
  } catch (err) {
    next(err);
  }
});

app.get('/courses/:id/details', async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id).populate('teacher');
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const students = await Enrollment.find({ course: course._id }).populate('student');
    res.json({
      course: {
        _id: course._id,
        name: course.name,
        description: course.description,
        teacher: course.teacher ? course.teacher._id : null,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      },
      students: students.map(s => s.student),
      teacher: course.teacher,
    });
  } catch (err) {
    next(err);
  }
});
// authenticate, authorize(['teacher', 'student']),
app.post('/courses', async (req, res, next) => {
  try {
    const { name, description, teacher, students } = req.body;
    const teacherUser = await User.findOne({ _id: teacher, role: 'teacher' });
    if (!teacherUser) return res.status(400).json({ error: 'Teacher not found or invalid role' });
    let studentUsers = [];
    if (students && students.length > 0) {
      studentUsers = await User.find({ _id: { $in: students }, role: 'student' });
      if (studentUsers.length !== students.length) {
        return res.status(400).json({ error: 'One or more students not found or invalid role' });
      }
    }
    const course = new Course({ name, description, teacher, students });
    await course.save();
    res.status(201).json(course);
  } catch (err) {
    next(err);
  }
});

app.get('/courses', async (req, res, next) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    next(err);
  }
});

app.put('/courses/:id', async (req, res, next) => {
  try {
    const { name, description, teacher, students } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (teacher !== undefined) {
      const teacherUser = await User.findOne({ _id: teacher, role: 'teacher' });
      if (!teacherUser) return res.status(400).json({ error: 'Teacher not found or invalid role' });
      update.teacher = teacher;
    }
    if (students !== undefined) {
      const studentUsers = await User.find({ _id: { $in: students }, role: 'student' });
      if (studentUsers.length !== students.length) {
        return res.status(400).json({ error: 'One or more students not found or invalid role' });
      }
      update.students = students;
    }
    const course = await Course.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (err) {
    next(err);
  }
});

app.delete('/courses/:id', async (req, res, next) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json({ message: 'Course deleted' });
  } catch (err) {
    next(err);
  }
});

// NodeMailer transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,  // your Gmail address
    pass: process.env.EMAIL_PASS,  // app password (not account password)
  },
});

// Enrollment endpoints
app.get('/enrollments', async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find();
    res.json(enrollments);
  } catch (err) {
    next(err);
  }
});

app.post('/enrollments', async (req, res, next) => {
  try {
    const { course, student } = req.body;
    if (!course || !student) {
      return res.status(400).json({ error: 'Course and student are required' });
    }
    // Check if course exists
    const courseExists = await Course.findById(course);
    if (!courseExists) {
      return res.status(400).json({ error: 'Course does not exist' });
    }
    // Check if student exists and is a student
    const studentExists = await User.findOne({ _id: student, role: 'student' });
    if (!studentExists) {
      return res.status(400).json({ error: 'Student does not exist or is not a student' });
    }
    // Prevent duplicate enrollment
    const exists = await Enrollment.findOne({ course, student });
    if (exists) {
      return res.status(400).json({ error: 'Student already enrolled in this course' });
    }
    const enrollment = new Enrollment({ course, student });
    await enrollment.save();
    res.status(201).json(enrollment);
  } catch (err) {
    next(err);
  }
});

app.get('/enrollments/:id', async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
    res.json(enrollment);
  } catch (err) {
    next(err);
  }
});

app.put('/enrollments/:id', async (req, res, next) => {
  try {
    const { course, student } = req.body;
    const update = {};
    if (course !== undefined) {
      const courseExists = await Course.findById(course);
      if (!courseExists) {
        return res.status(400).json({ error: 'Course does not exist' });
      }
      update.course = course;
    }
    if (student !== undefined) {
      const studentExists = await User.findOne({ _id: student, role: 'student' });
      if (!studentExists) {
        return res.status(400).json({ error: 'Student does not exist or is not a student' });
      }
      update.student = student;
    }
    const enrollment = await Enrollment.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
    res.json(enrollment);
  } catch (err) {
    next(err);
  }
});

app.delete('/enrollments/:id', async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findByIdAndDelete(req.params.id);
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
    res.json({ message: 'Enrollment deleted' });
  } catch (err) {
    next(err);
  }
});



// Forgot Password endpoint
app.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'No user with that email' });
    }

    const resetToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '15m' });
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();
    // Send email
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
    await transporter.sendMail({
      to: user.email,
      subject: 'Password Reset',
      html: `<p>You requested a password reset. <a href="${resetUrl}">Click here to reset your password</a>. This link will expire in 15 minutes.</p>`,
    });
    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    next(err);
  }
});

// Reset Password endpoint
app.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    const user = await User.findOne({
      _id: payload.id,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User API',
      version: '1.0.0',
      description: 'API documentation for User management',
    },
    servers: [
      {
        url: 'http://localhost:' + PORT,
      },
    ],
  },
  apis: ['./server.js'],
};



/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the user
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         age:
 *           type: integer
 *         role:
 *           type: string
 *           enum: [student, teacher]
 *           description: The role of the user (student or teacher)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: 60c72b2f9b1e8e001c8e4b8a
 *         name: John Doe
 *         email: john@example.com
 *         age: 30
 *         role: student
 *         createdAt: 2023-01-01T00:00:00.000Z
 *         updatedAt: 2023-01-01T00:00:00.000Z
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [User]
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *   post:
 *     summary: Create a new user
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Email must be unique
 *
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *   put:
 *     summary: Update a user by ID
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: User updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Email must be unique
 *       404:
 *         description: User not found
 *   delete:
 *     summary: Delete a user by ID
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: User not found
 */ 


/**
 * @swagger
 * /students/{id}/courses:
 *   get:
 *     summary: Get a student along with all enrolled courses
 *     tags: [Student]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The student ID
 *     responses:
 *       200:
 *         description: Student with enrolled courses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 student:
 *                   $ref: '#/components/schemas/User'
 *                 courses:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Course'
 *       404:
 *         description: Student not found
 */


/**
 * @swagger
 * /teachers/{id}/courses:
 *   get:
 *     summary: Get a teacher along with all courses they teach
 *     tags: [Teacher]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The teacher ID
 *     responses:
 *       200:
 *         description: Teacher with courses they teach
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 teacher:
 *                   $ref: '#/components/schemas/User'
 *                 courses:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Course'
 *       404:
 *         description: Teacher not found
 */


/**
 * @swagger
 * /courses/{id}/details:
 *   get:
 *     summary: Get a course with all student IDs enrolled and associated teacher information
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The course ID
 *     responses:
 *       200:
 *         description: Course details with students and teacher
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 course:
 *                   $ref: '#/components/schemas/Course'
 *                 students:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 teacher:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: Course not found
 */

/**
 * @swagger
 * /courses:
 *   post:
 *     summary: Create a new course
 *     tags: [Course]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - teacher
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               teacher:
 *                 type: string
 *                 description: User ID of the teacher
 *               students:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of User IDs for students
 *     responses:
 *       201:
 *         description: Course created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       400:
 *         description: Invalid input or teacher/student not found
 *   get:
 *     summary: Get all courses
 *     tags: [Course]
 *     responses:
 *       200:
 *         description: List of courses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 */
/**
 * @swagger
 * /courses/{id}:
 *   put:
 *     summary: Update a course
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The course ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               teacher:
 *                 type: string
 *                 description: User ID of the teacher
 *               students:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of User IDs for students
 *     responses:
 *       200:
 *         description: Course updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       400:
 *         description: Invalid input or teacher/student not found
 *       404:
 *         description: Course not found
 *   delete:
 *     summary: Delete a course
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The course ID
 *     responses:
 *       200:
 *         description: Course deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Course not found
 */


/**
 * @swagger
 * /forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *     responses:
 *       200:
 *         description: Password reset email sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: No user with that email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *
 * /reset-password:
 *   post:
 *     summary: Reset user password using a token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Password reset token received by email
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: New password to set
 *     responses:
 *       200:
 *         description: Password has been reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid or expired token, or missing fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */

/**
 * @swagger
 * /enrollments:
 *   get:
 *     summary: Get all enrollments
 *     tags: [Enrollment]
 *     responses:
 *       200:
 *         description: List of enrollments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Enrollment'
 *   post:
 *     summary: Create a new enrollment
 *     tags: [Enrollment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - course
 *               - student
 *             properties:
 *               course:
 *                 type: string
 *                 description: Course ID
 *               student:
 *                 type: string
 *                 description: Student ID
 *     responses:
 *       201:
 *         description: Enrollment created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Enrollment'
 *       400:
 *         description: Invalid input or duplicate enrollment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *
 * /enrollments/{id}:
 *   get:
 *     summary: Get an enrollment by ID
 *     tags: [Enrollment]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The enrollment ID
 *     responses:
 *       200:
 *         description: Enrollment found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Enrollment'
 *       404:
 *         description: Enrollment not found
 *   put:
 *     summary: Update an enrollment by ID
 *     tags: [Enrollment]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The enrollment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               course:
 *                 type: string
 *                 description: Course ID
 *               student:
 *                 type: string
 *                 description: Student ID
 *     responses:
 *       200:
 *         description: Enrollment updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Enrollment'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Enrollment not found
 *   delete:
 *     summary: Delete an enrollment by ID
 *     tags: [Enrollment]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The enrollment ID
 *     responses:
 *       200:
 *         description: Enrollment deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Enrollment not found
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Enrollment:
 *       type: object
 *       required:
 *         - course
 *         - student
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the enrollment
 *         course:
 *           type: string
 *           description: The course ID
 *         student:
 *           type: string
 *           description: The student ID
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: 60c72b2f9b1e8e001c8e4b8a
 *         course: 60c72b2f9b1e8e001c8e4b8b
 *         student: 60c72b2f9b1e8e001c8e4b8c
 *         createdAt: 2023-01-01T00:00:00.000Z
 *         updatedAt: 2023-01-01T00:00:00.000Z
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Course:
 *       type: object
 *       required:
 *         - name
 *         - teacher
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         teacher:
 *           type: string
 *           description: ID of the teacher (refers to User)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: 60c72b2f9b1e8e001c8e4b8d
 *         name: Introduction to React
 *         description: Learn the basics of React
 *         teacher: 60c72b2f9b1e8e001c8e4b8f
 *         createdAt: 2023-01-01T00:00:00.000Z
 *         updatedAt: 2023-01-01T00:00:00.000Z
 */


const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

