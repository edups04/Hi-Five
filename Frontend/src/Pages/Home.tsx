import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from "../assets/Hi-five.png";
import { homeCss as css, homeStyles as s } from "../styles/pages/Home.styles";
import { BookOpen, CircleUserRound, LogOut, PlusCircle, Settings, Sparkles, Square, Video } from "lucide-react";

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
    { id: 'record' as NavItem, label: 'Record', icon: <Video size={18} strokeWidth={1.8} /> },
    { id: 'library' as NavItem, label: 'Library', icon: <BookOpen size={18} strokeWidth={1.8} /> },
    { id: 'settings' as NavItem, label: 'Settings', icon: <Settings size={18} strokeWidth={1.8} /> },
  ];

  return (
    <div style={s.root} className="home-root">
      <style>{css}</style>

      {/* Sidebar */}
      <aside style={s.sidebar} className="home-sidebar">
        <div style={s.sidebarTop} className="home-sidebar-top">
          <div style={s.brand} className="home-brand">
            <img src={logo} alt="Hi-Five logo" style={{ width: "60px", height: "90px" }} />
            <div>
              <div style={s.brandName}>Hi-Five</div>
              <div style={s.brandSub}>ASL MADE VISIBLE</div>
            </div>
          </div>

          <nav style={s.nav} className="home-nav">
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

        <div style={s.sidebarBottom} className="home-sidebar-bottom">
          <button style={s.newRecBtn} className="new-rec-btn" onClick={startRecording}>
            <PlusCircle size={18} strokeWidth={1.8} /> New Recording
          </button>
          <button style={s.logoutBtn} className="logout-btn" onClick={logout}>
            <LogOut size={18} strokeWidth={1.8} /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={s.main} className="home-main">
        {/* Header */}
        <header style={s.header} className="home-header">
          <div className="home-title-wrap">
            <h1 style={s.pageTitle}>Start Recording</h1>
            <p style={s.pageSubtitle}>Try recording</p>
          </div>
          {picture ? (
            <img src={picture} alt="avatar" style={s.avatar} />
            ) : (
            <div style={s.avatarFallback}>
              <CircleUserRound size={22} color="#C2410C" strokeWidth={1.8} />
            </div>
            )}
        </header>

        {/* Camera area */}
  <div style={s.cameraWrap} className="home-camera-wrap">
          {/* Recording badge */}
          {isRecording && (
            <div style={s.recBadge} className="home-rec-badge">
              <span style={s.recDot} />
              REC {formatTime(seconds)}
            </div>
          )}

          {/* Try It Out badge */}
          <div style={s.tryBadge} className="home-try-badge">
            <Sparkles size={14} strokeWidth={1.8} /> Try It Out
          </div>

          {/* Video feed */}
          <video ref={videoRef} style={s.video} muted playsInline />

          {/* Dark overlay when not recording */}
          {!isRecording && <div style={s.overlay} />}

          {/* Stop button */}
          {isRecording && (
            <button style={s.stopBtn} className="stop-btn" onClick={stopRecording}>
              <Square size={22} fill="white" color="white" strokeWidth={1.8} />
            </button>
          )}

          {/* Start prompt */}
          {!isRecording && (
            <div style={s.startPrompt}>
              <p style={s.startText} className="home-start-text">Click "New Recording" to start</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Home;

