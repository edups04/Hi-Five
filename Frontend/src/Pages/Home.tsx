import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from "../assets/Hi-five.png";

const RecordIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M17 9l5-3v12l-5-3V9z" fill="currentColor"/>
  </svg>
);

const LibraryIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
    <rect x="14" y="3" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
    <rect x="14" y="12" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
    <rect x="3" y="16" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const StopIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="5" y="5" width="14" height="14" rx="2" fill="white"/>
  </svg>
);

const SparkleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z" fill="currentColor"/>
  </svg>
);

type NavItem = 'record' | 'library' | 'settings';

function Home() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState<NavItem>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Get user info from localStorage
  const userRaw = localStorage.getItem('user');
  const userObj = userRaw ? JSON.parse(userRaw) : null;
  const picture = userObj?.picture || userObj?.profileObj?.imageUrl || null;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch {
      alert('Camera access denied. Please allow camera access.');
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsRecording(false);
    setSeconds(0);
  }

  function formatTime(s: number) {
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sec}`;
  }

  function logout() {
    localStorage.removeItem('user');
    navigate('/auth');
  }

  const navItems = [
    { id: 'record' as NavItem, label: 'Record', icon: <RecordIcon /> },
    { id: 'library' as NavItem, label: 'Library', icon: <LibraryIcon /> },
    { id: 'settings' as NavItem, label: 'Settings', icon: <SettingsIcon /> },
  ];

  return (
    <div style={s.root}>
      <style>{css}</style>

      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.sidebarTop}>
          <div style={s.brand}>
            <img src={logo} alt="Hi-Five logo" style={{ width: "85px", height: "90px" }} />
            <div>
              <div style={s.brandName}>Hi-Five</div>
              <div style={s.brandSub}>SIGNING MADE VISIBLE</div>
            </div>
          </div>

          <nav style={s.nav}>
            {navItems.map(item => (
              <button
                key={item.id}
                style={{ ...s.navItem, ...(activeNav === item.id ? s.navItemActive : {}) }}
                className="nav-item"
                onClick={() => setActiveNav(item.id)}
              >
                <span style={{ color: activeNav === item.id ? '#fff' : '#C2410C' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div style={s.sidebarBottom}>
          <button style={s.newRecBtn} className="new-rec-btn" onClick={startRecording}>
            <PlusIcon /> New Recording
          </button>
          <button style={s.logoutBtn} className="logout-btn" onClick={logout}>
            <LogoutIcon /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={s.main}>
        {/* Header */}
        <header style={s.header}>
          <div>
            <h1 style={s.pageTitle}>Start Recording</h1>
            <p style={s.pageSubtitle}>Try recording</p>
          </div>
          {picture ? (
            <img src={picture} alt="avatar" style={s.avatar} />
            ) : (
            <div style={s.avatarFallback}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="#C2410C" strokeWidth="1.8"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#C2410C" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
            </div>
            )}
        </header>

        {/* Camera area */}
        <div style={s.cameraWrap}>
          {/* Recording badge */}
          {isRecording && (
            <div style={s.recBadge}>
              <span style={s.recDot} />
              REC {formatTime(seconds)}
            </div>
          )}

          {/* Try It Out badge */}
          <div style={s.tryBadge}>
            <SparkleIcon /> Try It Out
          </div>

          {/* Video feed */}
          <video ref={videoRef} style={s.video} muted playsInline />

          {/* Dark overlay when not recording */}
          {!isRecording && <div style={s.overlay} />}

          {/* Stop button */}
          {isRecording && (
            <button style={s.stopBtn} className="stop-btn" onClick={stopRecording}>
              <StopIcon />
            </button>
          )}

          {/* Start prompt */}
          {!isRecording && (
            <div style={s.startPrompt}>
              <p style={s.startText}>Click "New Recording" to start</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Home;

const s: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    height: '100vh',
    background: '#FAF0E8',
    fontFamily: "'Georgia', serif",
    overflow: 'hidden',
  },
  sidebar: {
    width: '210px',
    flexShrink: 0,
    background: '#FAF0E8',
    borderRight: '1px solid #F0D9C8',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '28px 16px 24px',
  },
  sidebarTop: { display: 'flex', flexDirection: 'column', gap: '32px' },
  brand: { display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '4px' },
  brandName: { fontSize: '18px', fontWeight: 800, color: '#3B1A00', letterSpacing: '-0.01em' },
  brandSub: { fontSize: '9px', color: '#C2410C', fontWeight: 700, letterSpacing: '0.1em', marginTop: '1px' },
  nav: { display: 'flex', flexDirection: 'column', gap: '4px' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '11px 14px', borderRadius: '10px',
    border: 'none', background: 'transparent',
    fontSize: '15px', fontWeight: 600, color: '#7A4520',
    cursor: 'pointer', textAlign: 'left', width: '100%',
    fontFamily: "'Georgia', serif",
    transition: 'all 0.15s ease',
  },
  navItemActive: {
    background: '#F97316',
    color: '#fff',
  },
  sidebarBottom: { display: 'flex', flexDirection: 'column', gap: '8px' },
  newRecBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    background: '#92400E', color: '#fff',
    border: 'none', borderRadius: '50px',
    padding: '13px 16px', fontSize: '14px', fontWeight: 700,
    cursor: 'pointer', width: '100%',
    fontFamily: "'Georgia', serif",
    transition: 'background 0.15s ease, transform 0.1s ease',
  },
  logoutBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    background: 'transparent', color: '#9B7355',
    border: 'none', padding: '10px',
    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
    fontFamily: "'Georgia', serif",
    transition: 'color 0.15s ease',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '28px 32px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
    pageTitle: { fontSize: '26px', fontWeight: 800, color: '#C2410C', margin: '0 0 4px', letterSpacing: '-0.01em' },
    pageSubtitle: { fontSize: '13px', color: '#9B7355', margin: 0 },
    avatar: { width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #F0D9C8' },
    cameraWrap: {
    flex: 1,
    position: 'relative',
    background: '#111',
    borderRadius: '16px',
    overflow: 'hidden',
    minHeight: 0,
  },
  recBadge: {
    position: 'absolute', top: '16px', left: '50%',
    transform: 'translateX(-50%)',
    background: '#DC2626', color: '#fff',
    borderRadius: '50px', padding: '6px 16px',
    fontSize: '13px', fontWeight: 700,
    display: 'flex', alignItems: 'center', gap: '8px',
    zIndex: 10, letterSpacing: '0.04em',
    fontFamily: "'Georgia', serif",
  },
  recDot: {
    width: '8px', height: '8px',
    borderRadius: '50%', background: '#fff',
    display: 'inline-block',
    animation: 'blink 1s infinite',
  },
  tryBadge: {
    position: 'absolute', top: '16px', right: '16px',
    background: 'rgba(0,0,0,0.7)', color: '#fff',
    borderRadius: '50px', padding: '6px 14px',
    fontSize: '13px', fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: '6px',
    zIndex: 10, border: '1px solid rgba(255,255,255,0.15)',
    fontFamily: "'Georgia', serif",
  },
  video: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  overlay: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(ellipse at center, #1a1a1a 0%, #000 100%)',
  },
  stopBtn: {
    position: 'absolute', bottom: '28px', left: '50%',
    transform: 'translateX(-50%)',
    width: '60px', height: '60px', borderRadius: '50%',
    background: '#DC2626', border: '3px solid #fff',
    cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10, boxShadow: '0 4px 20px rgba(220,38,38,0.5)',
    transition: 'transform 0.15s ease',
  },
  startPrompt: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 5,
  },
  startText: {
    color: 'rgba(255,255,255,0.3)', fontSize: '16px',
    fontFamily: "'Georgia', serif",
  },
    avatarFallback: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: '#FAF0E8',
    border: '2px solid #F0D9C8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
},
};

const css = `
  .nav-item:hover { background: rgba(249,115,22,0.12) !important; color: #C2410C !important; }
  .new-rec-btn:hover { background: #7C3410 !important; transform: translateY(-1px); }
  .logout-btn:hover { color: #C2410C !important; }
  .stop-btn:hover { transform: translateX(-50%) scale(1.08) !important; }
  @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
`;