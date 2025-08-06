import React, { useEffect, useState } from 'react';
import useAuthStore from '../store/authStore';

const EnrollmentRequests = ({ onDecision }) => {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!user?._id) return;
      try {
        const res = await fetch(`http://localhost:5000/teachers/${user._id}/enrollment-requests`, {
          credentials: 'include',
        });
        const data = await res.json();
        setRequests(data.requests || []);
      } catch {
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [user]);

  const handleDecision = async (id, decision) => {
    if (!window.confirm(`Are you sure you want to ${decision} this request?`)) return;
    try {
      const res = await fetch(`http://localhost:5000/enrollment-requests/${id}/decision`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      if (res.ok) {
        setRequests(requests.filter(r => r._id !== id));
        alert(`Request ${decision}`);
        if (onDecision) onDecision(); // <-- Refresh courses count after approval/rejection
      } else {
        alert('Failed to update request');
      }
    } catch {
      alert('Failed to update request');
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-8">
      <h2 className="text-2xl font-bold text-pink-200 mb-4">Enrollment Requests</h2>
      {loading ? (
        <p className="text-pink-100">Loading...</p>
      ) : requests.length === 0 ? (
        <p className="text-pink-100">No pending requests.</p>
      ) : (
        <ul className="space-y-4">
          {requests.map(req => (
            <li key={req._id} className="bg-white/10 rounded-lg p-4 border border-white/10">
              <div className="font-bold text-white text-lg">{req.course.name}</div>
              <div className="text-pink-200 text-sm">{req.course.description}</div>
              <div className="text-pink-100 text-sm">
                Student: {req.student.name} ({req.student.email})
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white"
                  onClick={() => handleDecision(req._id, 'approved')}
                >
                  Approve
                </button>
                <button
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white"
                  onClick={() => handleDecision(req._id, 'rejected')}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default EnrollmentRequests;