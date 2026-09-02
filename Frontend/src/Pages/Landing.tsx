import { useEffect, useRef, useState } from "react";
import logo from "../assets/Hi-five.png";
import { useNavigate } from "react-router-dom";
import { Accessibility, Bolt, Sparkles, Camera, CameraOff } from "lucide-react";
import { landingCss as css, landingStyles as s } from "../styles/pages/Landing.styles";

const ML_URL = (import.meta.env.VITE_ASL_API_URL as string | undefined) ?? "http://localhost:3001";

const STATS = [
    { value: "240K+", label: "ACTIVE LEARNERS" },
    { value: "1.2K",  label: "CERTIFIED MENTORS" },
    { value: "8M+",   label: "VIDEOS UPLOADED" },
    { value: "142",   label: "COUNTRIES" },
];

const STEPS = [
    { num: 1, title: "Record",    desc: "Position your camera. Our system detects sign language automatically with a simple high-five gesture to start." },
    { num: 2, title: "Translate", desc: "Our vision AI converts signs to high-fidelity text captions instantly." },
    { num: 3, title: "Connect",   desc: "Engage in by sharing videos, watching videos, and participate with our global community." },
];

const FEATURES = [
    { icon: Bolt,          title: "Instant",    desc: "Low-latency signing to text conversion." },
    { icon: Accessibility, title: "Accessible", desc: "Designed for and with the ASL community." },
    { icon: Sparkles,      title: "Smart",      desc: "Learns your specific signing style over time." },
];

function useInView(ref: React.RefObject<HTMLElement | null>) {
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.15 });
        obs.observe(el);
        return () => obs.disconnect();
    }, [ref]);
    return inView;
}

function LiveDemo() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [active, setActive] = useState(false);
    const [prediction, setPrediction] = useState<{ label: string; confidence: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function startCamera() {
        setError(null);
        setLoading(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setActive(true);
            setLoading(false);
            startPredicting();
        } catch {
            setError("Camera access denied. Please allow camera permissions.");
            setLoading(false);
        }
    }

    function stopCamera() {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        setActive(false);
        setPrediction(null);
    }

    function startPredicting() {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(async () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || video.readyState < 2) return;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(video, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            try {
                const res = await fetch(`${ML_URL}/predict`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: dataUrl, mode: 'asl' }),
                    signal: AbortSignal.timeout(2000),
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.hand_detected && data.label !== 'nothing') {
                        setPrediction({ label: data.label, confidence: data.confidence });
                    } else {
                        setPrediction(null);
                    }
                }
            } catch {}
        }, 200);
    }

    useEffect(() => () => { stopCamera(); }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={s.demoVideoBox}>
                <video
                    ref={videoRef}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: active ? 'block' : 'none' }}
                    muted playsInline
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {!active && (
                    <div style={s.demoOffState}>
                        <Camera size={48} color="#F97316" strokeWidth={1.5} />
                        <p style={s.demoOffText}>Camera is off</p>
                    </div>
                )}

                {active && (
                    <div style={{ ...s.demoPredictionBadge, background: prediction ? 'rgba(146,64,14,0.92)' : 'rgba(0,0,0,0.5)' }}>
                        {prediction ? (
                            <>
                                <div style={s.demoPredictionLabel}>{prediction.label.toUpperCase()}</div>
                                <div style={s.demoPredictionConf}>{Math.round(prediction.confidence * 100)}% confidence</div>
                            </>
                        ) : (
                            <div style={s.demoIdleText}>Show a hand sign...</div>
                        )}
                    </div>
                )}

                {error && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                        <p style={{ color: '#dc2626', fontSize: 14, fontWeight: 600, fontFamily: "'Manrope', sans-serif", textAlign: 'center', margin: 0 }}>{error}</p>
                    </div>
                )}
            </div>

            <div style={s.demoButtons}>
                {!active ? (
                    <button onClick={startCamera} disabled={loading} style={{ ...s.demoStartBtn, opacity: loading ? 0.7 : 1 }}>
                        <Camera size={18} strokeWidth={2} /> {loading ? 'Starting...' : 'Start Camera'}
                    </button>
                ) : (
                    <button onClick={stopCamera} style={s.demoStopBtn}>
                        <CameraOff size={18} strokeWidth={2} /> Stop Camera
                    </button>
                )}
            </div>

            <p style={s.demoHint}>
                No account needed to try.{' '}
                <span style={s.demoHintLink} onClick={() => window.location.href = '/auth'}>Sign up</span>
                {' '}to save recordings and join the community.
            </p>
        </div>
    );
}

export default function HiFiveLanding() {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const featuresRef = useRef<HTMLElement>(null);
    const howRef      = useRef<HTMLElement>(null);
    const demoRef     = useRef<HTMLElement>(null);
    const statsRef    = useRef<HTMLElement>(null);
    const ctaRef      = useRef<HTMLElement>(null);

    const featuresInView = useInView(featuresRef);
    const howInView      = useInView(howRef);
    const demoInView     = useInView(demoRef);
    const statsInView    = useInView(statsRef);
    const ctaInView      = useInView(ctaRef);

    function scrollTo(ref: React.RefObject<HTMLElement | null>) {
        ref.current?.scrollIntoView({ behavior: 'smooth' });
        setMenuOpen(false);
    }

    return (
        <div style={s.root}>
            <style>{css}</style>

            {/* NAVBAR */}
            <nav style={s.navbar}>
                <div style={s.navBrand}>
                    <img src={logo} alt="Hi-Five" style={{ width: 32, height: 44 }} />
                    <span style={s.navBrandName}>Hi-Five</span>
                </div>
                <div className="nav-links" style={s.navLinks}>
                    <button onClick={() => scrollTo(howRef)}      style={s.navLink} className="nav-link">How it Works</button>
                    <button onClick={() => scrollTo(featuresRef)} style={s.navLink} className="nav-link">Features</button>
                    <button onClick={() => scrollTo(demoRef)}     style={s.navLink} className="nav-link">Try Live</button>
                    <button onClick={() => navigate('/auth')}     style={s.navTryBtn} className="try-btn">Try It Out</button>
                    <div style={s.navAvatar}>G</div>
                </div>
                <button className="mobile-menu-btn" onClick={() => setMenuOpen(m => !m)} style={s.mobileMenuBtn}>☰</button>
            </nav>

            {menuOpen && (
                <div style={s.mobileMenu}>
                    <button onClick={() => scrollTo(howRef)}      style={s.mobileNavLink}>How it Works</button>
                    <button onClick={() => scrollTo(featuresRef)} style={s.mobileNavLink}>Features</button>
                    <button onClick={() => scrollTo(demoRef)}     style={s.mobileNavLink}>Try Live</button>
                    <button onClick={() => navigate('/auth')}     style={s.mobileNavBtn}>Try It Out</button>
                </div>
            )}

            {/* HERO */}
            <section style={s.hero}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28 }}>
                    <img src={logo} alt="Hi-Five" style={{ width: 140, height: 220, flexShrink: 0, marginTop: 8 }} />
                    <div>
                        <h1 style={s.heroHeading}>
                            Signing<br /><span style={s.heroHeadingAccent}>Made Visible</span>
                        </h1>
                        <p style={s.heroTagline}>
                            Hi-Five instantly translates ASL to text, making communication visible and accessible for everyone.
                        </p>
                        <div style={s.heroButtons}>
                            <button onClick={() => navigate('/auth')} style={s.heroCta} className="hero-cta">Try It Out</button>
                            <button onClick={() => scrollTo(demoRef)} style={s.heroSecondary} className="hero-secondary">
                                <span style={s.heroPlayIcon}>▶</span> Try It Live
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section ref={featuresRef} style={s.featuresSection} className={featuresInView ? 'section-visible' : 'section-hidden'}>
                <div style={s.featuresInner}>
                    <div style={s.featuresHeader}>
                        <div>
                            <h2 style={s.featuresHeading}>Human connection,<br />powered by smart tech.</h2>
                            <div style={s.featuresAccentLine} />
                        </div>
                        <p style={s.featuresSubtext}>Built for accessibility, designed for everyone.</p>
                    </div>
                    <div style={s.featuresGrid} className="features-grid">
                        {FEATURES.map(f => (
                            <div key={f.title} style={s.featureCard} className="feature-card">
                                <div style={s.featureIconWrap}>
                                    <f.icon size={22} color="#C2410C" strokeWidth={1.8} />
                                </div>
                                <h3 style={s.featureTitle}>{f.title}</h3>
                                <p style={s.featureDesc}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section ref={howRef} style={s.howSection} className={howInView ? 'section-visible' : 'section-hidden'}>
                <div style={s.howInner}>
                    <p style={s.howLabel}>PROCESS</p>
                    <h2 style={s.howHeading}>Three steps to seamless flow</h2>
                    <div style={s.howSteps}>
                        {STEPS.map((step, i) => (
                            <div key={step.num} style={{ ...s.howStepWrap, paddingBottom: i < STEPS.length - 1 ? 36 : 0 }}>
                                <div style={s.howStepLeft}>
                                    <div style={s.howStepNum}>{step.num}</div>
                                    {i < STEPS.length - 1 && <div style={s.howStepLine} />}
                                </div>
                                <div style={{ paddingTop: 6 }}>
                                    <h3 style={s.howStepTitle}>{step.title}</h3>
                                    <p style={s.howStepDesc}>{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* LIVE DEMO */}
            <section ref={demoRef} style={s.demoSection} className={demoInView ? 'section-visible' : 'section-hidden'}>
                <div style={s.demoInner}>
                    <p style={s.demoLabel}>LIVE DEMO</p>
                    <h2 style={s.demoHeading}>Try It Right Now</h2>
                    <p style={s.demoSubtext}>No account needed. Just allow camera access and start signing.</p>
                    <LiveDemo />
                </div>
            </section>

            {/* STATS */}
            <section ref={statsRef} style={s.statsSection} className={statsInView ? 'section-visible' : 'section-hidden'}>
                <div style={s.statsInner}>
                    <div style={s.statsVideoPlaceholder} className="stats-video-placeholder" />
                    <div style={s.statsGrid}>
                        {STATS.map(stat => (
                            <div key={stat.label} style={s.statCard}>
                                <div style={s.statValue}>{stat.value}</div>
                                <div style={s.statLabel}>{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section ref={ctaRef} style={s.ctaSection} className={ctaInView ? 'section-visible' : 'section-hidden'}>
                <div style={s.ctaInner}>
                    <div style={s.ctaCard}>
                        <h2 style={s.ctaHeading}>Signing made visible</h2>
                        <p style={s.ctaSubtext}>Join now</p>
                        <div style={s.ctaButtons}>
                            <button onClick={() => navigate('/auth')} style={s.ctaPrimary} className="hero-cta">Create Free Account</button>
                            <button onClick={() => scrollTo(demoRef)} style={s.ctaSecondary} className="hero-secondary">Learn More</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer style={s.footer}>
                <div style={s.footerInner}>
                    <div style={s.footerGrid} className="footer-grid">
                        <div>
                            <div style={s.footerBrand}>
                                <img src={logo} alt="Hi-Five" style={{ width: 28, height: 38 }} />
                                <span style={s.footerBrandName}>Hi-Five</span>
                            </div>
                            <p style={s.footerTagline}>Empowering the ASL community.</p>
                        </div>
                        {[
                            { label: 'Product',  links: ['Features', 'How it Works', 'Try It Out'] },
                            { label: 'Company',  links: ['How it Works', 'Community'] },
                            { label: 'Support',  links: ['Contact', 'Privacy'] },
                        ].map(col => (
                            <div key={col.label}>
                                <p style={s.footerColLabel}>{col.label}</p>
                                {col.links.map(l => (
                                    <p key={l} style={s.footerLink} className="footer-link">{l}</p>
                                ))}
                            </div>
                        ))}
                    </div>
                    <div style={s.footerBottom}>
                        <p style={s.footerCopy}>© 2026 Hi-Five. All rights reserved.</p>
                        <p style={s.footerCopy}>Designed for Accessibility · Built for Connection</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}