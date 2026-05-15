import { useEffect, useState } from 'react';
import axios from 'axios';
import { getData } from '../context/userContext';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/Hi-five.png';
import { authSuccessCss as css, authSuccessStyles as styles } from '../styles/pages/AuthSuccess.styles';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const AuthSuccess = () => {
    const { setUser } = getData();
    const navigate = useNavigate();
    const location = useLocation();
    const [logoReady, setLogoReady] = useState(false);

    useEffect(() => {
        const logoImage = new Image();
        logoImage.src = logo;
        logoImage.onload = () => setLogoReady(true);
        logoImage.onerror = () => setLogoReady(true);
    }, []);

    useEffect(() => {
        const handleAuth = async () => {
            try {
                let accessToken: string | null = null;

                const stateToken = location.state?.token;
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get("code");

                if (stateToken) {
                    accessToken = stateToken;
                } else if (code) {
                    const res = await axios.post(`${API_URL}/auth/exchange-code`, { code });
                    if (res.data.success) {
                        accessToken = res.data.token;
                    } else {
                        navigate("/auth");
                        return;
                    }
                } else {
                    navigate("/auth");
                    return;
                }

                if (accessToken) {
                    localStorage.setItem("accessToken", accessToken);
                    const res = await axios.get(`${API_URL}/auth/me`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });
                    if (res.data.success) {
                        setUser(res.data.user);
                        localStorage.setItem("user", JSON.stringify(res.data.user));
                        navigate("/home");
                    } else {
                        navigate("/auth");
                    }
                }
            } catch (error) {
                console.error("Auth error:", error);
                navigate("/auth");
            }
        };

        handleAuth();
    }, [navigate, setUser, location.state]);

    return (
        <div style={styles.root} className="auth-success-root">
            <style>{css}</style>
            <div style={styles.frame} className="auth-success-frame">
                {!logoReady ? (
                    <div
                        style={styles.spinner}
                        className="auth-success-spinner"
                        aria-label="Loading"
                        role="status"
                    />
                ) : (
                    <section style={styles.card} className="auth-success-card">
                        <img src={logo} alt="Hi-Five" style={styles.logo} />
                        <h2 style={styles.title} className="auth-success-title">
                            Logging In...
                        </h2>
                        <p style={styles.subtitle} className="auth-success-subtitle">
                            Please wait
                        </p>
                        <div
                            style={styles.spinner}
                            className="auth-success-spinner"
                            aria-label="Loading"
                            role="status"
                        />
                    </section>
                )}
            </div>
        </div>
    );
};

export default AuthSuccess;