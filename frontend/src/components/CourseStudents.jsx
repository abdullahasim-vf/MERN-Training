import React, { useEffect, useState } from 'react';
import useAuthStore from '../store/authStore';

const CourseStudents = ({ courseId, onStudentChange }) => {
  useAuthStore();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch(`http://localhost:5000/courses/${courseId}/students`, {
          credentials: 'include',
        });
        const data = await res.json();
        setStudents(data.students || []);
      } catch {
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [courseId]);

  const handleRemove = async (studentId) => {
    if (!window.confirm('Remove this student from the course?')) return;
    try {
      const res = await fetch(`http://localhost:5000/courses/${courseId}/students/${studentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setStudents(students.filter(s => s._id !== studentId));
        alert('Student removed');
        if (onStudentChange) onStudentChange(); // <-- Refresh
      } else {
        alert('Failed to remove student');
      }
    } catch {
      alert('Failed to remove student');
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <h2 className="text-xl font-bold text-pink-200 mb-4">Students in Course</h2>
      {loading ? (
        <p className="text-pink-100">Loading...</p>
      ) : students.length === 0 ? (
        <p className="text-pink-100">No students enrolled.</p>
      ) : (
        <ul className="space-y-4">
          {students.map(student => (
            <li key={student._id} className="bg-white/10 rounded-lg p-4 border border-white/10 flex justify-between items-center">
              <span className="text-white">{student.name} ({student.email})</span>
              <button
                className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded-lg text-white"
                onClick={() => handleRemove(student._id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CourseStudents;