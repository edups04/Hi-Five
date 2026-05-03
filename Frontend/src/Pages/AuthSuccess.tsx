import { useEffect, useState } from 'react'
import axios from 'axios';
import { getData } from '../context/userContext';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/Hi-five.png';
import { authSuccessCss as css, authSuccessStyles as styles } from '../styles/pages/AuthSuccess.styles';

const AuthSuccess = () => {
    const {setUser} = getData();
    const navigate = useNavigate();
    const [logoReady, setLogoReady] = useState(false);

    useEffect(() => {
        const logoImage = new Image();
        logoImage.src = logo;
        logoImage.onload = () => setLogoReady(true);
        logoImage.onerror = () => setLogoReady(true);
    }, []);

    useEffect (()=>{
        const handleAuth = async () => {
            const params = new URLSearchParams(window.location.search)
            console.log(params);
            const accessToken = params.get("token");
            console.log("Token", accessToken);

            if(accessToken) {
                localStorage.setItem("accessToken", accessToken);
                try {
                    const res = await axios.get('${API_URL}/auth/me', {
                        headers:{
                            Authorization: `Bearer ${accessToken}`
                        }
                    })
                    if(res.data.success) {
                        setUser(res.data.user);     //save user in context api store
                        localStorage.setItem("user", JSON.stringify(res.data.user));
                        navigate("/home");
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                }
            }

        }
        handleAuth();
    }, [navigate, setUser])
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
    )
    }

export default AuthSuccess
