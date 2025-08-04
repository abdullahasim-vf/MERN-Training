# Learning Platform Frontend

A modern React application with authentication, beautiful UI, and state management using Zustand.

## Features

- 🔐 **Authentication System**: Login and Register with JWT tokens
- 🎨 **Beautiful UI**: Modern design with Tailwind CSS
- 📱 **Responsive**: Works on all devices
- 🔄 **State Management**: Zustand for global state
- 🛡️ **Protected Routes**: Automatic redirects based on auth status
- 📊 **Dashboard**: User profile and statistics

## Tech Stack

- **React 19** - UI Framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Router** - Navigation
- **PostCSS** - CSS processing

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Backend server running on `http://localhost:5000`

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
src/
├── components/
│   ├── Login.jsx      # Login page component
│   ├── Register.jsx   # Registration page component
│   └── Home.jsx       # Dashboard/home page component
├── store/
│   ├── authStore.js   # Authentication state management
│   └── counterStore.jsx # Legacy counter store
├── App.jsx            # Main app with routing
├── main.jsx          # Entry point
└── index.css         # Global styles with Tailwind
```

## Authentication Flow

1. **Register**: Users can create accounts with name, email, password, role, and optional age
2. **Login**: Users authenticate with email and password
3. **Protected Routes**: Home page is only accessible to authenticated users
4. **Logout**: Users can log out and are redirected to login page

## API Endpoints

The frontend communicates with the backend at `http://localhost:5000`:

- `POST /login` - User authentication
- `POST /register` - User registration

## Styling

The application uses Tailwind CSS for styling with:
- Gradient backgrounds
- Modern card designs
- Responsive layouts
- Smooth transitions and hover effects
- Beautiful form inputs with validation

## State Management

Zustand is used for:
- User authentication state
- Loading states
- Error handling
- Persistent storage (localStorage)

## Development

- The app automatically redirects authenticated users to `/home`
- Unauthenticated users are redirected to `/login`
- All forms include validation and error handling
- Responsive design works on mobile and desktop
