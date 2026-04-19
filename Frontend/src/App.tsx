import { BrowserRouter, Routes, Route } from "react-router-dom";
import HiFiveLanding from './Pages/Landing';
import AuthPage from './Pages/LoginSignup';
import Home from './Pages/Home';
import { ProtectedRoutes, PublicRoutes } from "./ProtectedRoutes";
import { use, useEffect } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Routes */} 
        <Route element={<PublicRoutes />}>
          <Route path="/" element={<HiFiveLanding />} />
          <Route path="/auth" element={<AuthPage />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<ProtectedRoutes />}>
          <Route path="/home" element={<Home/>} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}