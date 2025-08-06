import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import CourseStudents from './CourseStudents';
import EnrollmentRequests from './EnrollmentRequests';

const TeacherHome = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showRequests, setShowRequests] = useState(false);

  // Fetch courses taught by the teacher
  

  const fetchCourses = useCallback(async () => {
    if (!user?._id) return;
    try {
      const res = await fetch(`http://localhost:5000/teachers/${user._id}/courses`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.courses) {
        const coursesWithCounts = await Promise.all(
          data.courses.map(async (course) => {
            const detailsRes = await fetch(`http://localhost:5000/courses/${course._id}/details`, {
              credentials: 'include',
            });
            const detailsData = await detailsRes.json();
            return {
              ...course,
              enrolledCount: detailsData.students ? detailsData.students.length : 0,
            };
          })
        );
        setCourses(coursesWithCounts);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCourses();
  }, [user, fetchCourses]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-900 to-purple-900 px-4">
      <div className="max-w-4xl w-full mt-5 mb-5 space-y-8 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8">
        <div className="text-center space-y-4">
          <div className="mx-auto h-20 w-20 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 rounded-full flex items-center justify-center shadow-lg">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 7v-7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white">Teacher Dashboard</h2>
          <p className="text-pink-200 text-sm">Welcome, {user?.name || 'Teacher'}!</p>
        </div>
        <div className="bg-white/10 border border-white/20 rounded-xl p-6 space-y-2 text-white mb-8">
          <div><span className="font-semibold">Name:</span> {user?.name}</div>
          <div><span className="font-semibold">Email:</span> {user?.email}</div>
          <div><span className="font-semibold">Role:</span> {user?.role}</div>
          <div><span className="font-semibold">Age:</span> {user?.age}</div>
        </div>
        <div className="flex justify-end mb-4">
          <button
            className="px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg text-white transition duration-200"
            onClick={() => setShowRequests(!showRequests)}
          >
            {showRequests ? 'Hide Enrollment Requests' : 'View Enrollment Requests'}
          </button>
        </div>
        {showRequests && <EnrollmentRequests onDecision={fetchCourses} />}
        <div className="bg-white/10 border border-white/20 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-pink-200 mb-4">Courses You Teach</h3>
          {loadingCourses ? (
            <p className="text-pink-100">Loading...</p>
          ) : courses.length === 0 ? (
            <p className="text-pink-100">You are not teaching any courses.</p>
          ) : (
            <ul className="space-y-4">
              {courses.map(course => (
                <li key={course._id} className="bg-white/10 rounded-lg p-4 border border-white/10">
                  <div className="font-bold text-white text-lg">{course.name}</div>
                  <div className="text-pink-200 text-sm">{course.description}</div>
                  <div className="text-pink-100 text-sm">
                    Enrolled Students: <span className="font-semibold">{course.enrolledCount}</span>
                  </div>
                  {selectedCourse === course._id ? (
                    <button
                      className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition duration-200"
                      onClick={() => setSelectedCourse(null)}
                    >
                      Hide Students
                    </button>
                  ) : (
                    <button
                      className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition duration-200"
                      onClick={() => setSelectedCourse(course._id)}
                    >
                      View Students
                    </button>
                  )}
                  {selectedCourse === course._id && (
                    <CourseStudents courseId={course._id} onStudentChange={fetchCourses} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="pt-6">
          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-300"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherHome;