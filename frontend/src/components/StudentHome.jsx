import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const StudentHome = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [appliedCourses, setAppliedCourses] = useState([]);

  useEffect(() => {
    // Fetch enrolled courses for the student
    const fetchCourses = async () => {
      if (!user?._id) return;
      try {
        const res = await fetch(`http://localhost:5000/students/${user._id}/courses`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.courses) {
          setCourses(data.courses);
        }
      } catch (error) {
        console.error('Failed to fetch courses:', error);
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };

    // Fetch available courses
    const fetchAvailableCourses = async () => {
      if (!user?._id) return;
      try {
        const res = await fetch(`http://localhost:5000/students/${user._id}/available-courses`, {
          credentials: 'include',
        });
        const data = await res.json();
        setAvailableCourses(data.courses || []);
      } catch (error) {
        console.error('Failed to fetch available courses:', error);
        setAvailableCourses([]);
      } finally {
        setLoadingAvailable(false);
      }
    };

    // Fetch applied requests
    const fetchAppliedRequests = async () => {
      if (!user?._id) return;
      try {
        const res = await fetch(`http://localhost:5000/enrollment-requests?student=${user._id}`, {
          credentials: 'include',
        });
        const data = await res.json();
        setAppliedCourses(data.requests ? data.requests.filter(r => r.status === 'pending').map(r => r.course) : []);
      } catch (error) {
        console.error('Failed to fetch requests:', error);
        setAppliedCourses([]);
      }
    };
    fetchCourses();
    fetchAvailableCourses();
    fetchAppliedRequests();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleApply = async (courseId) => {
    if (!window.confirm('Are you sure you want to apply for this course?')) return;
    try {
      const res = await fetch('http://localhost:5000/enrollment-requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course: courseId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Request sent to teacher!');
        setAppliedCourses(prev => [...prev, courseId]);
      } else {
        alert(data.error || 'Failed to send request');
      }
    } catch {
      alert('Failed to send request');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-4xl">
          {/* Glass Morphism Card */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 space-y-8 mt-5 mb-5">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="relative mx-auto w-24 h-24">
                <div className="w-full h-full bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
              </div>
              <div className="space-y-2">
                <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                  Welcome, Student
                </h2>
                <p className="text-purple-200 text-sm font-medium">
                  {user?.name} ({user?.email})
                </p>
              </div>
            </div>

            {/* Student Dashboard Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition duration-300">
                <h3 className="text-xl font-semibold text-purple-200 mb-4">Your Enrolled Courses</h3>
                {loadingCourses ? (
                  <p className="text-purple-100">Loading...</p>
                ) : courses.length === 0 ? (
                  <p className="text-purple-100">You are not enrolled in any courses.</p>
                ) : (
                  <ul className="space-y-4">
                    {courses.map(course => (
                      <li key={course._id} className="bg-white/10 rounded-lg p-4 border border-white/10">
                        <div className="font-bold text-white text-lg">{course.name}</div>
                        <div className="text-purple-200 text-sm">
                          Teacher: {course.teacher ? course.teacher.name || course.teacher : 'N/A'}
                        </div>
                        <div className="text-purple-100 text-sm">{course.description}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition duration-300">
                <h3 className="text-xl font-semibold text-purple-200 mb-4">Available Courses</h3>
                {loadingAvailable ? (
                  <p className="text-purple-100">Loading...</p>
                ) : availableCourses.length === 0 ? (
                  <p className="text-purple-100">No available courses.</p>
                ) : (
                  <ul className="space-y-4">
                    {availableCourses.map(course => (
                      <li key={course._id} className="bg-white/10 rounded-lg p-4 border border-white/10">
                        <div className="font-bold text-white text-lg">{course.name}</div>
                        <div className="text-purple-200 text-sm">
                          Teacher: {course.teacher ? course.teacher.name : 'N/A'}
                        </div>
                        <div className="text-purple-100 text-sm">{course.description}</div>
                        <button
                          className={`mt-2 px-4 py-2 rounded-lg text-white transition duration-200 ${appliedCourses.includes(course._id) ? 'bg-gray-400 cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-500'}`}
                          onClick={() => handleApply(course._id)}
                          disabled={appliedCourses.includes(course._id)}
                        >
                          {appliedCourses.includes(course._id) ? 'Applied' : 'Apply'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Logout Button */}
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
      </div>
    </div>
  );
};

export default StudentHome;