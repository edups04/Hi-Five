import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from "../assets/Hi-five.png";
import { homeCss as css, homeStyles as s } from "../styles/pages/Home.styles";
import { ListVideo, LogOut, Menu, PlusCircle, Settings, Sparkles, Square, Video, X } from "lucide-react";
import { getData } from '../context/userContext';

type NavItem = 'record' | 'library' | 'settings';

function Home() {
  const navigate = useNavigate();
  const { user } = getData();
  const [activeNav, setActiveNav] = useState<NavItem>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Get user info from localStorage
  const userRaw = localStorage.getItem('user');
  let userObj: any = null;

  try {
    userObj = userRaw ? JSON.parse(userRaw) : null;
  } catch {
    userObj = null;
  }

  const currentUser = (user && typeof user === 'object' ? user : null) || (userObj && typeof userObj === 'object' ? userObj : null);
  const picture = currentUser?.picture || currentUser?.profileObj?.imageUrl || null;
  const userName =
    currentUser?.username ||
    currentUser?.name ||
    currentUser?.given_name ||
    currentUser?.displayName ||
    currentUser?.profileObj?.name ||
    currentUser?.profileObj?.givenName ||
    'Guest';
  const avatarInitial = String(userName).trim().charAt(0).toUpperCase() || 'G';

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
    localStorage.removeItem('accessToken');  
  localStorage.removeItem('user');
    navigate('/auth');
}

  function handleNavSelect(item: NavItem) {
    if (item === 'library') {
      navigate('/library');
      setMobileMenuOpen(false);
      return;
    }

    setActiveNav(item);
    setMobileMenuOpen(false);
  }

  const navItems = [
    { id: 'record' as NavItem, label: 'Record', icon: <Video size={18} strokeWidth={1.8} /> },
    { id: 'library' as NavItem, label: 'Library', icon: <ListVideo size={18} strokeWidth={1.8} /> },
    { id: 'settings' as NavItem, label: 'Settings', icon: <Settings size={18} strokeWidth={1.8} /> },
  ];

  return (
    <div style={s.root} className="home-root">
      <style>{css}</style>

      {/* Sidebar */}
      <aside style={s.sidebar} className="home-sidebar">
        <div style={s.sidebarTop} className="home-sidebar-top">
          <div style={s.mobileTopRow} className="home-mobile-top-row">
            <div className="home-mobile-left-group">
              <button
                type="button"
                style={s.mobileMenuBtn}
                className="home-mobile-menu-btn"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={20} strokeWidth={2} />
              </button>

              <div style={s.brand} className="home-brand">
                <img src={logo} alt="Hi-Five logo" style={{ width: "60px", height: "90px" }} />
                <div>
                  <div style={s.brandName}>Hi-Five</div>
                  <div style={s.brandSub}>ASL MADE VISIBLE</div>
                </div>
              </div>
            </div>

            <div style={s.mobileActions} className="home-mobile-actions">
              {picture ? (
                <img src={picture} alt="avatar" style={s.avatar} className="home-mobile-avatar" />
              ) : (
                <div style={s.avatarFallback} className="home-mobile-avatar-fallback">
                  <span style={s.avatarInitial}>{avatarInitial}</span>
                </div>
              )}
            </div>
          </div>

          <nav style={s.nav} className="home-nav">
            {navItems.map(item => (
              <button
                key={item.id}
                style={{ ...s.navItem, ...(activeNav === item.id ? s.navItemActive : {}) }}
                className="nav-item"
                onClick={() => handleNavSelect(item.id)}
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

      <div
        className={`home-mobile-overlay ${mobileMenuOpen ? 'home-mobile-overlay-open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      <aside className={`home-mobile-drawer ${mobileMenuOpen ? 'home-mobile-drawer-open' : ''}`}>
        <div className="home-mobile-drawer-top">
          <button
            type="button"
            style={s.mobileMenuBtn}
            className="home-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <nav className="home-mobile-drawer-nav">
          {navItems.map(item => (
            <button
              key={`mobile-${item.id}`}
              style={{ ...s.navItem, ...(activeNav === item.id ? s.navItemActive : {}) }}
              className="nav-item"
              onClick={() => handleNavSelect(item.id)}
            >
              <span style={{ color: activeNav === item.id ? '#fff' : '#C2410C' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="home-mobile-drawer-bottom">
          <button
            style={{ ...s.logoutBtn, justifyContent: 'flex-start', padding: '11px 14px' }}
            className="logout-btn"
            onClick={logout}
          >
            <LogOut size={18} strokeWidth={1.8} /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={s.main} className="home-main">
        {activeNav === 'settings' ? (
          <section style={s.settingsWrap}>
            <h1 style={s.pageTitle}>Settings</h1>
            <p style={s.pageSubtitle}>Manage your account and preferences</p>
          </section>
        ) : (
          <>
            {/* Header */}
            <header style={s.header} className="home-header">
              <div className="home-title-wrap">
                <h1 style={s.pageTitle}>Start Recording</h1>
                <p style={s.pageSubtitle}>Try recording</p>
              </div>
              {picture ? (
                <img src={picture} alt="avatar" style={s.avatar} className="home-header-avatar" />
                ) : (
                <div style={s.avatarFallback} className="home-header-avatar-fallback">
                  <span style={s.avatarInitial}>{avatarInitial}</span>
                </div>
                )}
            </header>

            <button style={{ ...s.newRecBtn, ...s.mobileNewRecBtnHidden }} className="new-rec-btn home-mobile-new-rec-btn" onClick={startRecording}>
              <PlusCircle size={18} strokeWidth={1.8} /> New Recording
            </button>

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
          </>
        )}
      </main>
    </div>
  );
}

export default Home;

