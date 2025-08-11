import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const Profile = () => {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    age: user?.age || '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setMsg('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMsg('');
    if (form.password && form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    try {
      const body = {
        name: form.name,
        email: form.email,
        age: form.age,
      };
      if (form.password) body.password = form.password;
      const res = await fetch(`http://localhost:5000/users/${user._id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        setMsg('Profile updated successfully');
        setForm(f => ({ ...f, password: '', confirmPassword: '' }));
        // Redirect to home after short delay
        setTimeout(() => {
          if (user.role === 'teacher') navigate('/teacher-home');
          else navigate('/student-home');
        }, 1000);
      } else {
        setError(data.error || 'Update failed');
      }
    } catch {
      setError('Update failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-900 to-purple-900 px-4">
      <div className="max-w-md w-full space-y-8 backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8">
        {/* Back Button */}
        <button
          type="button"
          className="mb-4 flex items-center text-pink-200 hover:text-white transition"
          onClick={() => {
            if (user.role === 'teacher') navigate('/teacher-home');
            else navigate('/student-home');
          }}
        >
          <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </button>
        <h2 className="text-3xl font-bold text-white text-center mb-6">Profile & Settings</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-white mb-1">Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-white mb-1">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-white mb-1">Age</label>
            <input
              name="age"
              type="number"
              value={form.age}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none"
              required
              min={1}
              max={120}
            />
          </div>
          <div>
            <label className="block text-white mb-1">Role</label>
            <input
              value={user?.role}
              disabled
              className="w-full px-4 py-2 rounded-lg bg-white/20 text-gray-400 border border-white/30 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-white mb-1">New Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none"
              placeholder="Leave blank to keep current"
            />
          </div>
          <div>
            <label className="block text-white mb-1">Confirm New Password</label>
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none"
              placeholder="Leave blank to keep current"
            />
          </div>
          {error && <div className="text-red-400">{error}</div>}
          {msg && <div className="text-green-400">{msg}</div>}
          <button
            type="submit"
            className="w-full py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;