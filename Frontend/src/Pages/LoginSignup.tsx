import { useRef, useState } from "react";
import logo from "../assets/Hi-five.png";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff, Lock, Mail, Phone, UserRound, X, ShieldCheck, CheckCircle2 } from "lucide-react";
import { loginSignupCss as css, loginSignupStyles as st } from "../styles/pages/LoginSignup.styles";
import Google from "../assets/google-logo.png";
import { PasswordResetModal } from "../Modals/SendPasswordReset";
import { QRCodeSVG } from "qrcode.react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

type LegalModal = 'none' | 'privacy' | 'terms';
type TwoFAStep = 'qr' | 'otp' | 'success';

const PRIVACY_POLICY = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

1. Information We Collect
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

2. How We Use Your Information
Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.

3. Data Security
At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.

4. Your Rights
Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio.

5. Contact Us
Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.`;

const TERMS_OF_SERVICE = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. Maecenas vel nisl nec urna tincidunt tincidunt vel at nunc.

1. Acceptance of Terms
Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante.

2. Use of Service
Aenean ultricies mi vitae est. Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra.

3. User Accounts
Aenean fermentum, elit eget tincidunt condimentum, eros ipsum rutrum orci, sagittis tempus lacus enim ac dui.

4. Prohibited Activities
Tortor pretium viverra suspendisse potenti nullam ac tortor vitae purus faucibus ornare suspendisse sed nisi lacus.

5. Governing Law
These terms shall be governed by the laws of the Republic of the Philippines. Any disputes arising from these terms shall be subject to the jurisdiction of Philippine courts.`;

const PASSWORD_RULES = [
    { key: 'length',  label: 'At least 8 characters',         test: (p: string) => p.length >= 8 },
    { key: 'upper',   label: 'At least one uppercase letter',  test: (p: string) => /[A-Z]/.test(p) },
    { key: 'lower',   label: 'At least one lowercase letter',  test: (p: string) => /[a-z]/.test(p) },
    { key: 'number',  label: 'At least one number',            test: (p: string) => /[0-9]/.test(p) },
    { key: 'special', label: 'At least one special character', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

function passwordValid(p: string) { return PASSWORD_RULES.every(r => r.test(p)); }

export default function AuthPage() {
    const [tab, setTab] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState("");
    const [phone, setPhone] = useState("");
    const [agreedPrivacy, setAgreedPrivacy] = useState(false);
    const [agreedTerms, setAgreedTerms] = useState(false);
    const [legalModal, setLegalModal] = useState<LegalModal>('none');
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [passwordTouched, setPasswordTouched] = useState(false);

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
    const [finishError, setFinishError] = useState<string | null>(null);

    const navigate = useNavigate();

    function resetSignupFields() {
        setUsername(""); setPhone("");
        setAgreedPrivacy(false); setAgreedTerms(false);
        setError(null); setPasswordTouched(false);
        setSignupOtp(Array(6).fill(''));
        setSignupOtpError(null); setTwoFAStep('qr');
        setQrSecret(''); setQrUrl('');
        setFinishError(null); 
    }

    function makeOtpHandlers(
        otp: string[],
        setOtp: (v: string[]) => void,
        refs: React.MutableRefObject<(HTMLInputElement | null)[]>
    ) {
        const onChange = (index: number, value: string) => {
            const digit = value.replace(/\D/g, '').slice(-1);
            const next = [...otp]; next[index] = digit; setOtp(next);
            if (digit && index < 5) {
                setTimeout(() => refs.current[index + 1]?.focus(), 0);
            }
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
        if (!phone.trim()) { setError("Please enter your phone number."); return; }
        if (!agreedPrivacy || !agreedTerms) { setError("Please agree to the Privacy Policy and Terms of Service."); return; }

        try {
            const res = await axios.post(`${API_URL}/setup-2fa`, { email, username });
            if (res.data.success) {
                setQrSecret(res.data.secret);
                setQrUrl(res.data.otpauthUrl);
                try {
                    const check = await axios.post(`${API_URL}/check-duplicate`, { email, username });
                    if (!check.data.available) {
                        setError(check.data.message);
                        return;
                    }
                } catch {
                    setError("Network error. Please try again.");
                    return;
                }
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
        const fullPhone = `+63${phone.trim()}`;
        setFinishError(null);
        try {
            const result = await axios.post(`${API_URL}/signup`, {
                username, email, password,
                phone: fullPhone,
                twoFactorEnabled: true,
                twoFactorSecret: qrSecret,
            });
            if (result.data.success) {
                setShow2FA(false);
                setTab("login");
                resetSignupFields();
            } else {
                setFinishError(result.data.message || "Signup failed.");
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Network error. Please try again.";
            setFinishError(msg);
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
                        setLoginUserId(result.data.userId);
                        setLoginOtp(Array(6).fill(''));
                        setLoginOtpError(null);
                        setShowLogin2FA(true);
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
                        <button style={{ ...st.tab, ...(tab === "login" ? st.tabActive : st.tabInactive) }} className="tab-btn" onClick={() => { setTab("login"); setError(null); setPasswordTouched(false); setEmail(""); setPassword(""); setUsername(""); setPhone(""); setAgreedPrivacy(false); setAgreedTerms(false); }}>Log In</button>
                        <button style={{ ...st.tab, ...(tab === "signup" ? st.tabActive : st.tabInactive) }} className="tab-btn" onClick={() => { setTab("signup"); setError(null); setPasswordTouched(false); setEmail(""); setPassword(""); setUsername(""); setPhone(""); setAgreedPrivacy(false); setAgreedTerms(false); }}>Sign Up</button>
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
                            <>
                                <div style={st.fieldGroup}>
                                    <label style={st.label}>PHONE NUMBER</label>
                                    <div style={st.inputWrap}>
                                        <span style={st.inputIcon}><Phone size={16} color="#C2410C" strokeWidth={1.8} /></span>
                                        <span style={st.phonePrefix}>+63</span>
                                        <input style={st.input} type="tel" placeholder="9XXXXXXXXX" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="auth-input" maxLength={10} />
                                    </div>
                                </div>

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
                            </>
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
                                {finishError && (
                                    <p style={{ ...st.errorText, textAlign: "center", margin: "0" }}>{finishError}</p>
                                )}
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