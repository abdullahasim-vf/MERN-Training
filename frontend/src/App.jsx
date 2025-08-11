import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import TeacherHome from './components/TeacherHome';
import StudentHome from './components/StudentHome';
import EnrollmentRequests from './components/EnrollmentRequests';
import CourseStudents from './components/CourseStudents'; 
import Profile from './components/Profile';
import useAuthStore from './store/authStore';
import './index.css';

const ProtectedRoute = ({ children, role }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (role && user?.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Routes */}
        <Route
          path="/teacher-home"
          element={
            <ProtectedRoute role="teacher">
              <TeacherHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student-home"
          element={
            <ProtectedRoute role="student">
              <StudentHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher-requests"
          element={
            <ProtectedRoute role="teacher">
              <EnrollmentRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/course-students"
          element={
            <ProtectedRoute role="teacher">
              <CourseStudents />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
