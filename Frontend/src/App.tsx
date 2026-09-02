import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HiFiveLanding from './Pages/Landing';
import AuthPage from './Pages/LoginSignup';
import Home from './Pages/Home';
import Library from './Pages/Library';
import Settings from './Pages/Settings.jsx';
import ResetPassword from './Pages/ResetPassword';
import { ProtectedRoutes, PublicRoutes } from "./ProtectedRoutes";
import 'bootstrap/dist/css/bootstrap.min.css';
import AuthSuccess from "./Pages/AuthSuccess";
import AdminApp from "./Pages/Admin";
import FeedPage from './Pages/FeedPage';
import VideoView from './Pages/VideoView';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Admin — own auth, no ProtectedRoutes wrapper */}
        <Route path="/admin/*" element={<AdminApp />} />

        {/* Public Routes */}
        <Route element={<PublicRoutes />}>
          <Route path="/" element={<HiFiveLanding />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth-success" element={<AuthSuccess />} />
          <Route path="/reset-password/:id/:token/*" element={<ResetPassword />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<ProtectedRoutes />}>
          <Route path="/recording" element={<Home/>} />
          <Route path="/home" element={<Navigate to="/recording" />} />
          <Route path="/library" element={<Library/>} />
          <Route path="/settings" element={<Settings/>} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/video/:id" element={<VideoView />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}