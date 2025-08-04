# 🎓 Learning Management System (LMS)

This is a full-stack web application that functions as a Learning Management System (LMS) with integrated role-based access (students and teachers), course management, enrollment system, and secure authentication.

---

## 🚀 Features

- 🧑‍🏫 **User Roles** – Students and Teachers with different access levels
- 📚 **Course Management** – Create, read, update, and delete courses
- 🎯 **Enrollment System** – Students can enroll in courses, teachers can manage enrollments
- 🔒 **Secure Authentication** – Login, registration, and password reset via email
- 📧 **Email Support** – Integrated with Gmail/Microsoft using nodemailer
- 📊 **Student Dashboard** – View enrolled courses
- 👩‍🏫 **Teacher Dashboard** – Manage taught courses and student enrollments
- 📝 **Swagger API Documentation** – Comprehensive API documentation
- 🛡️ **Security Features** – Rate limiting, XSS protection, data sanitization

---

## 🧠 Tech Stack

### 🔗 Backend
- **Node.js & Express** – Server framework
- **MongoDB + Mongoose** – Database and ORM
- **JWT** – Token-based authentication
- **Nodemailer** – Email support
- **Swagger** – API documentation
- **Dotenv** – Environment variable management
- **CORS** – Cross-origin resource sharing
- **XSS-Clean** – XSS protection
- **Express Rate Limit** – Request throttling

### 🖼️ Frontend
- **React.js** – Frontend framework
- **Vite** – Frontend build tool
- **React Router** – Client-side routing

---

## 🛠️ Setup & Installation

### ✅ Prerequisites
- Node.js (v16+) + npm/yarn
- MongoDB (local or Atlas)
- Gmail/Microsoft account with App Password enabled

---

### 🔧 Setup

Frontend Setup
```bash
cd frontend
npm run dev

---

###  Backend Setup

```bash
cd Backend/Test
nodemon server.js

---


