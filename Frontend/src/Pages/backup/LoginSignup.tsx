import { useRef, useState, useEffect } from "react";
import logo from "../assets/Hi-five.png";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff, Lock, Mail, UserRound, X, ShieldCheck, CheckCircle2 } from "lucide-react";
import { loginSignupCss as css, loginSignupStyles as st } from "../styles/pages/LoginSignup.styles";
import Google from "../assets/google-logo.png";
import { PasswordResetModal } from "../Modals/SendPasswordReset";
import { QRCodeSVG } from "qrcode.react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const TRUSTED_DEVICE_KEY = "hifive_trusted_device";
const TRUSTED_DEVICE_EXPIRY_DAYS = 7;

type LegalModal = 'none' | 'privacy' | 'terms';
type TwoFAStep = 'qr' | 'otp' | 'success';

const PRIVACY_POLICY = `Hi-Five — ASL Made Visible 

Effective: May 2026 | Last Updated: May 16, 2026

01 — OVERVIEW 

What is Hi-Five?

Hi-Five is a web-based video recording system that uses machine learning to automatically detect American Sign Language (ASL) hand signs and display them as real-time on-screen captions. This Privacy Policy explains what personal data we collect when you use Hi-Five and how we handle it.

Our commitment: We only collect what is strictly necessary to run the platform. We do not sell your data, and we do not use your content for any purpose beyond providing the service to you.

02 — DATA WE COLLECT

Information We Collect

When you create an account or use Hi-Five, we collect only the following:

Account Credentials

Your username and email address, used to identify your account. Your password is never stored as plain text, it is encrypted using industry-standard hashing before it is saved to our database.

System Logs

We automatically collect basic usage logs (e.g., login events, errors) solely for system monitoring and platform stability. These logs are not used for profiling, advertising, or any other purpose.

Video Recordings

Videos you record using Hi-Five are saved to your personal library. We do not collect or transmit your raw video footage beyond your own account storage. See the Videos section below for more detail.

03 — HOW WE USE IT

How We Use Your Information

- To create and manage your account on Hi-Five.

- To authenticate your identity when you log in.

- To allow you to record, save, and export captioned videos.

- To monitor system health, detect errors, and keep the platform running smoothly.

- To respond to support requests you submit to us.

We do NOT use your data for advertising, sell it to third parties, or share it with any external companies.

04 — YOUR VIDEOS

How We Handle Your Videos

Your recorded videos are stored privately in your account library. Here is what you need to know:

- Only you can view and access your videos through your account.

- Administrators can see a list of video entries (title, date, duration) for system monitoring purposes — but cannot view or play the actual video content.

- You can delete any video at any time, and it will be permanently removed from our servers.

- We do not use your video content to train machine learning models or for any other purpose outside of delivering the service to you.

05 — SECURITY

How We Protect Your Data

We take security seriously and apply the following protections:

- Encrypted passwords: Your password is hashed using a cryptographic algorithm before storage. No one, including our team can read your password.

- HTTPS: All data transmitted between your browser and our servers is encrypted using TLS (HTTPS).

- Access controls: Only authorized personnel can access system infrastructure, and even then, access is limited to what is necessary for their role.

- No third-party data sharing: We do not share your personal data with any third party unless required by law.

06 — YOUR RIGHTS

Your Rights Under Philippine Law

Under the Data Privacy Act of 2012 (Republic Act No. 10173), you have the following rights regarding your personal data:

- Right to Access: You can request a copy of the personal data we hold about you.

- Right to Correction: You can update your username and account details at any time through Settings.

- Right to Deletion: You can delete your account and all associated data. Deletion is permanent and irreversible.

- Right to Object: You may object to any processing of your data that you believe is not necessary or lawful.

- Right to Data Portability: You may request your data in a portable, machine-readable format.

To exercise any of these rights, please contact us using the details below.

07 — DATA PROTECTION

Data Protection Officer

In compliance with the National Privacy Commission (NPC) requirements under the Data Privacy Act of 2012, Hi-Five designates a Data Protection Officer (DPO) responsible for ensuring your privacy rights are upheld.

You may contact our Data Protection Officer directly for any privacy-related concerns, requests, or complaints. See the contact section below.

08 — CONTACT US

Get in Touch

If you have any questions about this Privacy Policy or wish to exercise your data rights, please reach out to us:

Hi-Five Privacy Team

Data Protection Officer / Research Team

Gordon College — Bachelor of Science in Computer Science

Email: 2026hifive@gmail.com

Website: https://hi-five-ten.vercel.app

We will respond to all privacy requests within 15 business days in accordance with the Data Privacy Act of 2012.

© 2026 Gehirn Team · Gordon College · BSCS Research Project

Hi-Five — ASL Made Visible · All rights reserved.

`;

const TERMS_OF_SERVICE = `Hi-Five — ASL Made Visible.

Effective: May 2026 | Last Updated: May 16, 2026

By using Hi-Five, you agree to these terms.

1. WHO CAN USE IT

Only students, teachers, and authorized users may register.

2. YOUR ACCOUNT

- Use your real information when signing up.

- Keep your password private.

- One account per person only.

3. YOUR VIDEOS

- Your recordings are yours.

- We store them only to run the service.

- Do not record anything illegal or harmful.

4. What you CANNOT do

- Do not hack or misuse the platform.

- Do not pretend to be someone else.

- Do not share your account with others.

5. NO GUARANTEES

Hi-Five is a student research project.

ASL recognition may not always be 100% accurate.

6. DELETING YOUR ACCOUNT

You can delete your account anytime in Settings.

This removes all your data permanently.

7. OUR RIGHTS

We can suspend accounts that break these rules.

We may update these terms anytime.

8. PHILIPPINE LAW

These terms follow Philippine law, including the Data Privacy Act of 2012 (RA 10173).

Questions? Contact us:

Email:   2026@hifve@gmail.com

Website: https://hi-five-ten.vercel.app

Gehirn Team · Gordon College · BSCS 2026`;

const PASSWORD_RULES = [
    { key: 'length',  label: 'At least 8 characters',         test: (p: string) => p.length >= 8 },
    { key: 'upper',   label: 'At least one uppercase letter',  test: (p: string) => /[A-Z]/.test(p) },
    { key: 'lower',   label: 'At least one lowercase letter',  test: (p: string) => /[a-z]/.test(p) },
    { key: 'number',  label: 'At least one number',            test: (p: string) => /[0-9]/.test(p) },
    { key: 'special', label: 'At least one special character', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

function passwordValid(p: string) { return PASSWORD_RULES.every(r => r.test(p)); }

function getTrustedDevice(userId: string): boolean {
    try {
        const raw = localStorage.getItem(`${TRUSTED_DEVICE_KEY}_${userId}`);
        if (!raw) return false;
        const { expiry } = JSON.parse(raw);
        if (Date.now() > expiry) { localStorage.removeItem(`${TRUSTED_DEVICE_KEY}_${userId}`); return false; }
        return true;
    } catch { return false; }
}

function setTrustedDevice(userId: string) {
    const expiry = Date.now() + TRUSTED_DEVICE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(`${TRUSTED_DEVICE_KEY}_${userId}`, JSON.stringify({ expiry }));
}

export function clearTrustedDevice(userId: string) {
    localStorage.removeItem(`${TRUSTED_DEVICE_KEY}_${userId}`);
}

export default function AuthPage() {
    const [tab, setTab] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState("");
    const [agreedPrivacy, setAgreedPrivacy] = useState(false);
    const [agreedTerms, setAgreedTerms] = useState(false);
    const [legalModal, setLegalModal] = useState<LegalModal>('none');
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [finishError, setFinishError] = useState<string | null>(null);

    const [show2FA, setShow2FA] = useState(false);
    const [twoFAStep, setTwoFAStep] = useState<TwoFAStep>('qr');
    const [qrSecret, setQrSecret] = useState('');
    const [qrUrl, setQrUrl] = useState('');
    const [signupOtp, setSignupOtp] = useState<string[]>(Array(6).fill(''));
    const [signupOtpError, setSignupOtpError] = useState<string | null>(null);
    const [verifyingSignup, setVerifyingSignup] = useState(false);
    const signupOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

    const [showLogin2FA, setShowLogin2FA] = useState(false);
    const [loginUserId, setLoginUserId] = useState('');
    const [loginOtp, setLoginOtp] = useState<string[]>(Array(6).fill(''));
    const [loginOtpError, setLoginOtpError] = useState<string | null>(null);
    const [verifyingLogin, setVerifyingLogin] = useState(false);
    const loginOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const err = params.get('error');
        if (err === 'deactivated') {
            setError("Your account is deactivated. Please sign up to create a new account.");
            window.history.replaceState({}, '', '/auth');
        } else if (err === 'google_failed') {
            setError("Google login failed. Please try again.");
            window.history.replaceState({}, '', '/auth');
        }
    }, []);

    function clearForm() {
        setEmail(""); setPassword(""); setUsername("");
        setAgreedPrivacy(false); setAgreedTerms(false);
        setError(null); setPasswordTouched(false); setFinishError(null);
    }

    function resetSignupFields() {
        setUsername(""); setAgreedPrivacy(false); setAgreedTerms(false);
        setError(null); setPasswordTouched(false);
        setSignupOtp(Array(6).fill(''));
        setSignupOtpError(null); setTwoFAStep('qr');
        setQrSecret(''); setQrUrl(''); setFinishError(null);
    }

    function makeOtpHandlers(
        otp: string[],
        setOtp: (v: string[]) => void,
        refs: React.MutableRefObject<(HTMLInputElement | null)[]>
    ) {
        const onChange = (index: number, value: string) => {
            const digit = value.replace(/\D/g, '').slice(-1);
            const next = [...otp]; next[index] = digit; setOtp(next);
            if (digit && index < 5) setTimeout(() => refs.current[index + 1]?.focus(), 0);
        };
        const onKeyDown = (index: number, e: React.KeyboardEvent) => {
            if (e.key === 'Backspace' && !otp[index] && index > 0) refs.current[index - 1]?.focus();
        };
        const onPaste = (e: React.ClipboardEvent) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            const next = Array(6).fill('');
            pasted.split('').forEach((d, i) => { next[i] = d; });
            setOtp(next);
            refs.current[Math.min(pasted.length, 5)]?.focus();
        };
        return { onChange, onKeyDown, onPaste };
    }

    const signupOtpHandlers = makeOtpHandlers(signupOtp, setSignupOtp, signupOtpRefs);
    const loginOtpHandlers = makeOtpHandlers(loginOtp, setLoginOtp, loginOtpRefs);

    async function handleCreateAccount() {
        setError(null);
        if (!username.trim() || !email.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) { setError("Please enter a valid email address."); return; }
        if (!passwordValid(password)) { setError("Password does not meet all requirements."); return; }
        if (!agreedPrivacy || !agreedTerms) { setError("Please agree to the Privacy Policy and Terms of Service."); return; }

        try {
            const check = await axios.post(`${API_URL}/check-duplicate`, { email, username });
            if (!check.data.available) { setError(check.data.message); return; }
        } catch {
            setError("Network error. Please try again.");
            return;
        }

        try {
            const res = await axios.post(`${API_URL}/setup-2fa`, { email, username });
            if (res.data.success) {
                setQrSecret(res.data.secret);
                setQrUrl(res.data.otpauthUrl);
                setTwoFAStep('qr');
                setSignupOtp(Array(6).fill(''));
                setSignupOtpError(null);
                setShow2FA(true);
            } else {
                setError("Failed to set up 2FA. Please try again.");
            }
        } catch {
            setError("Network error. Please try again.");
        }
    }

    async function handleVerifySignupOtp() {
        const code = signupOtp.join('');
        if (code.length < 6) { setSignupOtpError('Please enter all 6 digits.'); return; }
        setVerifyingSignup(true);
        setSignupOtpError(null);
        try {
            const res = await axios.post(`${API_URL}/verify-2fa-setup`, { token: code, secret: qrSecret });
            if (res.data.success) {
                setTwoFAStep('success');
            } else {
                setSignupOtpError(res.data.message || 'Invalid code. Please try again.');
            }
        } catch {
            setSignupOtpError('Network error. Please try again.');
        } finally {
            setVerifyingSignup(false);
        }
    }

    async function handleFinish2FA() {
        setFinishError(null);
        try {
            const result = await axios.post(`${API_URL}/signup`, {
                username, email, password,
                twoFactorEnabled: true,
                twoFactorSecret: qrSecret,
            });
            if (result.data.success) {
                if (result.data.user?._id) {
                    setTrustedDevice(result.data.user._id);
                }
                setShow2FA(false);
                setTab("login");
                clearForm();
                resetSignupFields();
            } else {
                setFinishError(result.data.message || "Signup failed.");
            }
        } catch (err: any) {
            setFinishError(err?.response?.data?.message || "Network error. Please try again.");
        }
    }

    function handleLogin(e: React.FormEvent | React.MouseEvent) {
        e.preventDefault();
        setError(null);
        axios.post(`${API_URL}/login`, { email, password })
            .then(result => {
                if (result.data.success) {
                    if (result.data.role === 'admin') {
                        sessionStorage.setItem('adminToken', result.data.token);
                        sessionStorage.setItem('adminUsername', result.data.username || 'Admin');
                        navigate('/admin');
                    } else if (result.data.requires2FA) {
                        const userId = result.data.userId;
                        if (getTrustedDevice(userId)) {
                            axios.post(`${API_URL}/verify-2fa-trusted`, { userId })
                                .then(r => {
                                    if (r.data.success) {
                                        navigate("/auth-success", { state: { token: r.data.token } });
                                    } else {
                                        setLoginUserId(userId);
                                        setLoginOtp(Array(6).fill(''));
                                        setLoginOtpError(null);
                                        setShowLogin2FA(true);
                                    }
                                })
                                .catch(() => {
                                    setLoginUserId(userId);
                                    setLoginOtp(Array(6).fill(''));
                                    setLoginOtpError(null);
                                    setShowLogin2FA(true);
                                });
                        } else {
                            setLoginUserId(userId);
                            setLoginOtp(Array(6).fill(''));
                            setLoginOtpError(null);
                            setShowLogin2FA(true);
                        }
                    } else {
                        navigate("/auth-success", { state: { token: result.data.token } });
                    }
                } else {
                    setError(result.data.message || "Login failed.");
                }
            })
            .catch(() => setError("Network error. Please try again."));
    }

    async function handleVerifyLoginOtp() {
        const code = loginOtp.join('');
        if (code.length < 6) { setLoginOtpError('Please enter all 6 digits.'); return; }
        setVerifyingLogin(true);
        setLoginOtpError(null);
        try {
            const res = await axios.post(`${API_URL}/verify-2fa-login`, { userId: loginUserId, token: code });
            if (res.data.success) {
                setTrustedDevice(loginUserId);
                setShowLogin2FA(false);
                navigate("/auth-success", { state: { token: res.data.token } });
            } else {
                setLoginOtpError(res.data.message || 'Invalid code. Please try again.');
            }
        } catch {
            setLoginOtpError('Network error. Please try again.');
        } finally {
            setVerifyingLogin(false);
        }
    }

    function OtpBoxes({
        otp, refs, handlers
    }: {
        otp: string[];
        refs: React.MutableRefObject<(HTMLInputElement | null)[]>;
        handlers: ReturnType<typeof makeOtpHandlers>;
    }) {
        return (
            <div style={st.otpWrap} onPaste={handlers.onPaste}>
                {otp.map((digit, i) => (
                    <input
                        key={i}
                        ref={el => {
                            refs.current[i] = el;
                            if (i === 0 && el && !otp.some(d => d)) el.focus();
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handlers.onChange(i, e.target.value)}
                        onKeyDown={e => handlers.onKeyDown(i, e)}
                        onClick={() => refs.current[i]?.select()}
                        style={{ ...st.otpInput, ...(digit ? st.otpInputFilled : {}) }}
                        className="otp-input"
                    />
                ))}
            </div>
        );
    }

    return (
        <div style={st.root} className="auth-root">
            <style>{css}</style>

            <div style={st.card} className="auth-card">
                <div style={st.left} className="auth-left">
                    <div style={st.leftContent}>
                        <img src={logo} alt="Hi-Five logo" style={{ width: "100px", height: "160px" }} />
                        <h2 style={st.leftTitle}>Hi–Five</h2>
                        <p style={st.leftSub}>Signing made visible</p>
                        <div style={st.quoteBox}>
                            <p style={st.quoteText}>"Bridging the gap between ASL signers and the hearing world."</p>
                        </div>
                    </div>
                </div>

                <div style={st.right} className="auth-right">
                    <div style={st.tabs} className="auth-tabs">
                        <button style={{ ...st.tab, ...(tab === "login" ? st.tabActive : st.tabInactive) }} className="tab-btn" onClick={() => { setTab("login"); clearForm(); }}>Log In</button>
                        <button style={{ ...st.tab, ...(tab === "signup" ? st.tabActive : st.tabInactive) }} className="tab-btn" onClick={() => { setTab("signup"); clearForm(); }}>Sign Up</button>
                    </div>

                    <div style={st.formWrap} className="auth-form-wrap">
                        <h3 style={st.formTitle}>Welcome</h3>
                        <p style={st.formSub}>{tab === "login" ? "Log in to continue your journey" : "Create your account to start your journey"}</p>

                        {tab === "signup" && (
                            <div style={st.fieldGroup}>
                                <label style={st.label}>USERNAME</label>
                                <div style={st.inputWrap}>
                                    <span style={st.inputIcon}><UserRound size={16} color="#C2410C" strokeWidth={1.8} /></span>
                                    <input style={st.input} type="text" placeholder="username" value={username} onChange={e => setUsername(e.target.value)} className="auth-input" />
                                </div>
                            </div>
                        )}

                        <div style={st.fieldGroup}>
                            <label style={st.label}>EMAIL ADDRESS</label>
                            <div style={st.inputWrap}>
                                <span style={st.inputIcon}><Mail size={16} color="#C2410C" strokeWidth={1.8} /></span>
                                <input style={st.input} type="email" placeholder="name@gmail.com" value={email} onChange={e => setEmail(e.target.value)} className="auth-input" />
                            </div>
                        </div>

                        <div style={st.fieldGroup}>
                            <div style={st.labelRow}>
                                <label style={st.label}>PASSWORD</label>
                                {tab === "login" && (
                                    <button type="button" style={st.forgotBtn} className="forgot-btn" onClick={() => setOpen(true)}>Forgot password?</button>
                                )}
                            </div>
                            <div style={st.inputWrap}>
                                <span style={st.inputIcon}><Lock size={16} color="#C2410C" strokeWidth={1.8} /></span>
                                <input
                                    style={st.input}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="········"
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); if (tab === 'signup') setPasswordTouched(true); }}
                                    className="auth-input"
                                />
                                <button type="button" style={st.passwordToggleBtn} className="password-toggle-btn" onClick={() => setShowPassword(p => !p)}>
                                    {showPassword ? <EyeOff size={16} color="#9B7355" strokeWidth={1.9} /> : <Eye size={16} color="#9B7355" strokeWidth={1.9} />}
                                </button>
                            </div>
                            {tab === 'signup' && passwordTouched && password.length > 0 && (
                                <div style={{ marginTop: 8, padding: "10px 14px", background: "#FAF0E8", borderRadius: 10, border: "1px solid #F0D9C8", display: "flex", flexDirection: "column", gap: 5 }}>
                                    {PASSWORD_RULES.map(rule => {
                                        const passed = rule.test(password);
                                        return (
                                            <div key={rule.key} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                                <span style={{ width: 16, height: 16, borderRadius: "50%", background: passed ? "#16a34a" : "#F0D9C8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s ease" }}>
                                                    {passed && <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                                </span>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: passed ? "#16a34a" : "#9B7355", fontFamily: "'Manrope', sans-serif", transition: "color 0.2s ease" }}>{rule.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {tab === "signup" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                                <label style={st.checkboxRow}>
                                    <input type="checkbox" checked={agreedPrivacy} onChange={e => setAgreedPrivacy(e.target.checked)} style={{ marginTop: 2, accentColor: "#F97316", flexShrink: 0 }} />
                                    <span style={st.checkboxLabel}>I have read and agree to the{" "}
                                        <button type="button" style={st.legalLink} onClick={() => setLegalModal('privacy')}>Privacy Policy</button>
                                    </span>
                                </label>
                                <label style={st.checkboxRow}>
                                    <input type="checkbox" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)} style={{ marginTop: 2, accentColor: "#F97316", flexShrink: 0 }} />
                                    <span style={st.checkboxLabel}>I have read and agree to the{" "}
                                        <button type="button" style={st.legalLink} onClick={() => setLegalModal('terms')}>Terms of Service</button>
                                    </span>
                                </label>
                            </div>
                        )}

                        {error && <p style={st.errorText}>{error}</p>}

                        <button style={st.submitBtn} className="submit-btn" onClick={tab === "login" ? handleLogin : handleCreateAccount}>
                            {tab === "login" ? "Login" : "Create Account"}
                        </button>

                        <div style={st.dividerRow}><div style={st.dividerLine} /></div>

                        <button onClick={() => window.open(`${API_URL}/auth/google`, "_self")} style={st.googleBtn} className="google-btn">
                            <img src={Google} alt="Google Logo" style={{ width: "30px", height: "32px" }} />
                            Continue with Google
                        </button>

                        <p style={st.backText}>
                            <button style={st.backBtn} className="forgot-btn" onClick={() => navigate("/")}>Back to Home</button>
                        </p>
                    </div>
                </div>
            </div>

            <PasswordResetModal isOpen={open} onClose={() => setOpen(false)} />

            {show2FA && (
                <div style={st.modalBackdrop}>
                    <div style={st.modalCard} onClick={e => e.stopPropagation()}>
                        {twoFAStep === 'qr' && (
                            <>
                                <div style={st.modalHeader}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <ShieldCheck size={22} color="#F97316" strokeWidth={2} />
                                        <h2 style={st.modalTitle}>Set Up Two-Factor Authentication</h2>
                                    </div>
                                    <button type="button" onClick={() => { setShow2FA(false); resetSignupFields(); }} style={st.modalCloseBtn} className="auth-modal-close">
                                        <X size={20} strokeWidth={2} />
                                    </button>
                                </div>
                                <div style={st.modalBody}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                                        <div style={st.qrBox}>
                                            {qrUrl && <QRCodeSVG value={qrUrl} size={180} fgColor="#3B1A00" bgColor="#fff" level="M" />}
                                        </div>
                                        <div style={{ textAlign: "center" }}>
                                            <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#3B1A00", fontFamily: "'Manrope', sans-serif" }}>
                                                Scan with Google Authenticator
                                            </p>
                                            <p style={st.qrDescription}>
                                                Download <strong>Google Authenticator</strong> or <strong>Authy</strong> on your phone. Open the app, tap the <strong>+</strong> button, then scan this QR code. Your app will generate a 6-digit code that refreshes every 30 seconds.
                                            </p>
                                        </div>
                                        <div style={st.manualCodeWrap}>
                                            <p style={st.manualCodeLabel}>CAN'T SCAN? ENTER THIS CODE MANUALLY</p>
                                            <p style={st.manualCode}>{qrSecret}</p>
                                        </div>
                                    </div>
                                </div>
                                <div style={st.modalFooter}>
                                    <button style={st.primaryBtn} onClick={() => setTwoFAStep('otp')} className="auth-primary-btn">Next →</button>
                                </div>
                            </>
                        )}

                        {twoFAStep === 'otp' && (
                            <>
                                <div style={st.modalHeader}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <ShieldCheck size={22} color="#F97316" strokeWidth={2} />
                                        <h2 style={st.modalTitle}>Enter Verification Code</h2>
                                    </div>
                                    <button type="button" onClick={() => { setShow2FA(false); resetSignupFields(); }} style={st.modalCloseBtn} className="auth-modal-close">
                                        <X size={20} strokeWidth={2} />
                                    </button>
                                </div>
                                <div style={st.modalBody}>
                                    <p style={{ margin: 0, fontSize: 13, color: "#9B7355", fontFamily: "'Manrope', sans-serif", lineHeight: 1.6 }}>
                                        Open your authenticator app and enter the 6-digit code shown for <strong style={{ color: "#3B1A00" }}>Hi-Five</strong>.
                                    </p>
                                    <OtpBoxes otp={signupOtp} refs={signupOtpRefs} handlers={signupOtpHandlers} />
                                    {signupOtpError && <p style={{ ...st.errorText, textAlign: "center", margin: 0 }}>{signupOtpError}</p>}
                                </div>
                                <div style={st.modalFooter}>
                                    <button style={st.secondaryBtn} onClick={() => setTwoFAStep('qr')} className="auth-secondary-btn">← Back</button>
                                    <button style={{ ...st.primaryBtn, opacity: verifyingSignup ? 0.7 : 1 }} onClick={handleVerifySignupOtp} disabled={verifyingSignup} className="auth-primary-btn">
                                        {verifyingSignup ? 'Verifying…' : 'Verify'}
                                    </button>
                                </div>
                            </>
                        )}

                        {twoFAStep === 'success' && (
                            <div style={st.successWrap}>
                                <div style={st.successIcon}><CheckCircle2 size={40} color="#16a34a" strokeWidth={2} /></div>
                                <h2 style={st.successTitle}>You're all set!</h2>
                                <p style={st.successSub}>Two-factor authentication has been successfully enabled. Your account is now more secure.</p>
                                {finishError && <p style={{ ...st.errorText, textAlign: "center", margin: "0" }}>{finishError}</p>}
                                <button style={{ ...st.primaryBtn, padding: "13px 32px", fontSize: 15 }} onClick={handleFinish2FA} className="auth-primary-btn">
                                    Continue to Login
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showLogin2FA && (
                <div style={st.modalBackdrop}>
                    <div style={st.modalCard} onClick={e => e.stopPropagation()}>
                        <div style={st.modalHeader}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <ShieldCheck size={22} color="#F97316" strokeWidth={2} />
                                <h2 style={st.modalTitle}>Two-Factor Authentication</h2>
                            </div>
                        </div>
                        <div style={st.modalBody}>
                            <p style={{ margin: 0, fontSize: 13, color: "#9B7355", fontFamily: "'Manrope', sans-serif", lineHeight: 1.6 }}>
                                Open your authenticator app and enter the 6-digit code shown for <strong style={{ color: "#3B1A00" }}>Hi-Five</strong>.
                            </p>
                            <OtpBoxes otp={loginOtp} refs={loginOtpRefs} handlers={loginOtpHandlers} />
                            {loginOtpError && <p style={{ ...st.errorText, textAlign: "center", margin: 0 }}>{loginOtpError}</p>}
                        </div>
                        <div style={st.modalFooter}>
                            <button style={st.secondaryBtn} onClick={() => setShowLogin2FA(false)} className="auth-secondary-btn">Cancel</button>
                            <button style={{ ...st.primaryBtn, opacity: verifyingLogin ? 0.7 : 1 }} onClick={handleVerifyLoginOtp} disabled={verifyingLogin} className="auth-primary-btn">
                                {verifyingLogin ? 'Verifying…' : 'Verify'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {legalModal !== 'none' && (
                <div style={st.modalBackdrop} onClick={() => setLegalModal('none')}>
                    <div style={{ ...st.modalCard, maxHeight: "80vh" }} onClick={e => e.stopPropagation()}>
                        <div style={st.modalHeader}>
                            <h2 style={st.modalTitle}>{legalModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}</h2>
                            <button type="button" onClick={() => setLegalModal('none')} style={st.modalCloseBtn} className="auth-modal-close">
                                <X size={20} strokeWidth={2} />
                            </button>
                        </div>
                        <div style={st.legalBody}>
                            {(legalModal === 'privacy' ? PRIVACY_POLICY : TERMS_OF_SERVICE).trim().split('\n\n').map((para, i) => (
                                <p key={i} style={{ margin: "0 0 14px" }}>{para}</p>
                            ))}
                        </div>
                        <div style={st.modalFooter}>
                            <button style={st.secondaryBtn} onClick={() => setLegalModal('none')} className="auth-secondary-btn">Close</button>
                            <button style={st.primaryBtn} onClick={() => { if (legalModal === 'privacy') setAgreedPrivacy(true); else setAgreedTerms(true); setLegalModal('none'); }} className="auth-primary-btn">
                                I Agree
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}