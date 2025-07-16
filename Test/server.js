const express = require('express');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
 
app.use((req, res, next) => {
  console.log(`IP: ${req.ip}, Method: ${req.method}, URL: ${req.originalUrl}`);
  next();
});

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
  age: { type: Number, required: false },
  role: { type: String, enum: ['student', 'teacher'], required: true },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

const Course = mongoose.model('Course', courseSchema);


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

app.get('/students/:id/courses', async (req, res, next) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const courses = await Course.find({ students: student._id });
    res.json({ student, courses });
  } catch (err) {
    next(err);
  }
});

app.get('/teachers/:id/courses', async (req, res, next) => {
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
    const course = await Course.findById(req.params.id).populate('teacher').populate('students');
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json({
      course: {
        _id: course._id,
        name: course.name,
        description: course.description,
        students: course.students.map(s => s._id),
        teacher: course.teacher ? course.teacher._id : null,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      },
      students: course.students,
      teacher: course.teacher,
    });
  } catch (err) {
    next(err);
  }
});

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
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));