import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from "../assets/Hi-five.png";
import { homeCss as css, homeStyles as s } from "../styles/pages/Home.styles";
import { ListVideo, LogOut, Menu, PlusCircle, Settings, Sparkles, Square, Video, X, Eraser, Maximize2, Minimize2 } from "lucide-react";
import { getData } from '../context/userContext';
import { useFrameCapture } from '../hooks/useFrameCapture';
import { useVideoRecorder } from '../hooks/useVideoRecorder';
import { RecordingPreviewModal } from '../Modals/RecordingPreview';
import { uploadRecording } from '../lib/recordingsClient';
import { useToast } from '../components/Toast';
import ASLOverlay from "../components/AslOverlay";
import { type SignMode } from '../lib/aslClient';

type NavItem = 'record' | 'library' | 'settings';

function Home() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = getData();
  const [activeNav, setActiveNav] = useState<NavItem>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [spacePulse, setSpacePulse] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showDebug, setShowDebug] = useState(true);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [pendingDurationSec, setPendingDurationSec] = useState(0);
  const [pendingSentence, setPendingSentence] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [signMode, setSignMode] = useState<SignMode>('both');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraWrapRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showASLOverlay, setShowASLOverlay] = useState(false);

  const {
    sentence,
    lastPrediction,
    fps: predictFps,
    clearSentence,
    backspace,
    appendSpace,
  } = useFrameCapture(videoRef, isRecording, { fps: 5, mode: signMode });

  const recorder = useVideoRecorder();

  const sentenceRef = useRef('');
  useEffect(() => {
    sentenceRef.current = sentence;
  }, [sentence]);

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
      recorder.stop();
    };
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key === 'c' || e.key === 'C') {
        clearSentence();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        appendSpace();
        setSpacePulse(true);
        setTimeout(() => setSpacePulse(false), 250);
      } else if (e.key === 'd' || e.key === 'D') {
        setShowDebug(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isRecording, clearSentence, backspace, appendSpace]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  function toggleFullscreen() {
    const el = cameraWrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {
        console.warn('[fullscreen] requestFullscreen() rejected');
      });
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
      recorder.start(stream, () => sentenceRef.current, (blob) => {
        setPendingBlob(blob);
      });
    } catch {
      alert('Camera access denied. Please allow camera access.');
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    setPendingDurationSec(seconds);
    setPendingSentence(sentenceRef.current);
    recorder.stop();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsRecording(false);
    setSeconds(0);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  async function handleKeep(name: string) {
    if (!pendingBlob || isSaving) return;
    setIsSaving(true);
    try {
      const meta = await uploadRecording({
        blob: pendingBlob,
        name,
        sentence: pendingSentence,
        durationMs: pendingDurationSec * 1000,
      });
      toast.success(`Saved "${meta.name}"`);
      setPendingBlob(null);
      setPendingDurationSec(0);
      setPendingSentence('');
      clearSentence();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      toast.error(`Save failed: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  }

  function handleDiscard() {
    if (isSaving) return;
    setPendingBlob(null);
    setPendingDurationSec(0);
    setPendingSentence('');
    clearSentence();
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
    if (item === 'library') { navigate('/library'); setMobileMenuOpen(false); return; }
    if (item === 'settings') { navigate('/settings'); setMobileMenuOpen(false); return; }
    setActiveNav(item);
    setMobileMenuOpen(false);
  }

  const navItems = [
    { id: 'record' as NavItem, label: 'Record', icon: <Video size={18} strokeWidth={1.8} /> },
    { id: 'library' as NavItem, label: 'Library', icon: <ListVideo size={18} strokeWidth={1.8} /> },
    { id: 'settings' as NavItem, label: 'Settings', icon: <Settings size={18} strokeWidth={1.8} /> },
  ];

  const modeOptions: { value: SignMode; label: string }[] = [
    { value: 'asl', label: 'ASL' },
    { value: 'both', label: 'Both' },
    { value: 'fsl', label: 'FSL' },
  ];

  return (
    <div style={s.root} className="home-root">
      <style>{css}</style>

      <aside style={s.sidebar} className="home-sidebar">
        <div style={s.sidebarTop} className="home-sidebar-top">
          <div style={s.mobileTopRow} className="home-mobile-top-row">
            <div className="home-mobile-left-group">
              <button type="button" style={s.mobileMenuBtn} className="home-mobile-menu-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
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
              <button type="button" onClick={() => navigate('/settings')} title="Go to Settings" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                {picture ? (
                  <img src={picture} alt="avatar" style={s.avatar} className="home-mobile-avatar" />
                ) : (
                  <div style={s.avatarFallback} className="home-mobile-avatar-fallback">
                    <span style={s.avatarInitial}>{avatarInitial}</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          <nav style={s.nav} className="home-nav">
            {navItems.map(item => (
              <button key={item.id} style={{ ...s.navItem, ...(activeNav === item.id ? s.navItemActive : {}) }} className="nav-item" onClick={() => handleNavSelect(item.id)}>
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

      <div className={`home-mobile-overlay ${mobileMenuOpen ? 'home-mobile-overlay-open' : ''}`} onClick={() => setMobileMenuOpen(false)} />

      <aside className={`home-mobile-drawer ${mobileMenuOpen ? 'home-mobile-drawer-open' : ''}`}>
        <div className="home-mobile-drawer-top">
          <button type="button" style={s.mobileMenuBtn} className="home-mobile-menu-btn" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <nav className="home-mobile-drawer-nav">
          {navItems.map(item => (
            <button key={`mobile-${item.id}`} style={{ ...s.navItem, ...(activeNav === item.id ? s.navItemActive : {}) }} className="nav-item" onClick={() => handleNavSelect(item.id)}>
              <span style={{ color: activeNav === item.id ? '#fff' : '#C2410C' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="home-mobile-drawer-bottom">
          <button style={{ ...s.logoutBtn, justifyContent: 'flex-start', padding: '11px 14px' }} className="logout-btn" onClick={logout}>
            <LogOut size={18} strokeWidth={1.8} /> Logout
          </button>
        </div>
      </aside>

      <main style={s.main} className="home-main">
        {activeNav === 'settings' ? (
          <section style={s.settingsWrap}>
            <h1 style={s.pageTitle}>Settings</h1>
            <p style={s.pageSubtitle}>Manage your account and preferences</p>
          </section>
        ) : (
          <>
            <header style={s.header} className="home-header">
              <div className="home-title-wrap">
                <h1 style={s.pageTitle}>Start Recording</h1>
                <p style={s.pageSubtitle}>Try recording</p>
              </div>
              <button type="button" onClick={() => navigate('/settings')} title="Go to Settings" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                {picture ? (
                  <img src={picture} alt="avatar" style={s.avatar} className="home-header-avatar" />
                ) : (
                  <div style={s.avatarFallback} className="home-header-avatar-fallback">
                    <span style={s.avatarInitial}>{avatarInitial}</span>
                  </div>
                )}
              </button>
            </header>

            <div className="sign-mode-row">
              <button style={{ ...s.newRecBtn, ...s.mobileNewRecBtnHidden }} className="new-rec-btn home-mobile-new-rec-btn" onClick={startRecording}>
                <PlusCircle size={18} strokeWidth={1.8} /> New Recording
              </button>
              <div className="sign-mode-toggle">
                {modeOptions.map(opt => (
                  <button
                    key={opt.value}
                    className={`sign-mode-btn${signMode === opt.value ? ' active' : ''}`}
                    onClick={() => setSignMode(opt.value)}
                    disabled={isRecording}
                    title={isRecording ? 'Stop recording to change mode' : `Switch to ${opt.label} mode`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div ref={cameraWrapRef} style={s.cameraWrap} className="home-camera-wrap" onDoubleClick={toggleFullscreen}>
              {isRecording && (
                <div style={s.recBadge} className="home-rec-badge">
                  <span style={s.recDot} />
                  REC {formatTime(seconds)}
                </div>
              )}

              <div style={{ ...s.tryBadge, cursor: 'pointer' }} className="home-try-badge" onClick={() => setShowASLOverlay(true)}>
                <Sparkles size={14} strokeWidth={1.8} /> Try It Out
              </div>

              <button type="button" style={s.fsBtn} className="asl-fs-btn" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen (F)'} title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (F)'}>
                {isFullscreen ? <Minimize2 size={16} strokeWidth={2} /> : <Maximize2 size={16} strokeWidth={2} />}
              </button>

              {isRecording && showDebug && lastPrediction && (
                <div style={s.debugOverlay} className="asl-debug-overlay">
                  <div>
                    <span style={lastPrediction.hand_detected ? s.debugLabelGood : s.debugLabelNone}>
                      {lastPrediction.label}
                    </span>
                    {' '}
                    {(lastPrediction.confidence * 100).toFixed(0)}%
                  </div>
                  <div style={s.debugFps}>{predictFps.toFixed(1)} fps</div>
                </div>
              )}

              <video ref={videoRef} style={s.video} muted playsInline />
              {!isRecording && <div style={s.overlay} />}

              {isRecording && (
                <button style={s.stopBtn} className="stop-btn" onClick={stopRecording}>
                  <Square size={22} fill="white" color="white" strokeWidth={1.8} />
                </button>
              )}

              {!isRecording && !pendingBlob && (
                <div style={s.startPrompt}>
                  <p style={s.startText} className="home-start-text">Click "New Recording" to start</p>
                </div>
              )}

              {sentence && (
                <div style={s.subtitleWrap} className="asl-subtitle-wrap">
                  <p style={s.subtitleText} className={`asl-subtitle-text${spacePulse ? ' asl-subtitle-pulse' : ''}`}>
                    {sentence}
                  </p>
                </div>
              )}

              {isRecording && sentence && (
                <button type="button" onClick={clearSentence} title="Clear sentence (or press 'C')" style={s.clearBtn} className="asl-clear-btn">
                  <Eraser size={15} strokeWidth={1.8} />
                  Clear
                </button>
              )}

              <ASLOverlay visible={showASLOverlay} onClose={() => setShowASLOverlay(false)} />
            </div>
          </>
        )}
      </main>

      <RecordingPreviewModal blob={pendingBlob} onKeep={handleKeep} onDiscard={handleDiscard} isSaving={isSaving} />
    </div>
  );
}

export default Home;