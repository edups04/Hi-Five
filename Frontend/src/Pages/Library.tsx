import { useEffect, useMemo, useState } from 'react';
    import { useNavigate } from 'react-router-dom';
    import logo from '../assets/Hi-five.png';
    import { libraryCss as css, libraryStyles as s } from '../styles/pages/Library.styles';
    import { CirclePlay, ListVideo, Loader2, LogOut, Menu, PlusCircle, Search, Settings, SlidersHorizontal, Trash2, Video, X } from 'lucide-react';
    import { getData } from '../context/userContext';
    import { listRecordings, renameRecording, deleteRecording, type RecordingMeta } from '../lib/recordingsClient';
    import { formatDuration, formatRelativeDate, recordingCountLabel } from '../lib/formatters';
    import { useToast } from '../components/Toast';
    import { RecordingPlaybackModal } from '../Modals/RecordingPlayback';

    type NavItem = 'record' | 'library' | 'settings';

    function Library() {
    const navigate = useNavigate();
    const toast = useToast();
    const { user } = getData();
    const [activeNav, setActiveNav] = useState<NavItem>('library');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Library data state. `recordings` is the canonical list; `query` filters
    // it client-side (no debounce — the list is small, the filter is cheap).
    const [recordings, setRecordings] = useState<RecordingMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    // Currently-playing recording (if any). null means no playback modal open.
    const [playing, setPlaying] = useState<RecordingMeta | null>(null);

    // Fetch recordings on mount. Define `load` so we can re-call it after
    // mutations (rename, delete) instead of trying to keep state perfectly
    // synced — refetching is simpler and the list is small.
    async function load() {
        setLoading(true);
        setLoadError(null);
        try {
            const data = await listRecordings();
            setRecordings(data);
        } catch (err) {
            setLoadError(err instanceof Error ? err.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Client-side filter.
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return recordings;
        return recordings.filter(r =>
            r.name.toLowerCase().includes(q) ||
            (r.sentence || '').toLowerCase().includes(q),
        );
    }, [recordings, query]);

    // ----- Action handlers ---------------------------------------------------

    async function handleRename(recording: RecordingMeta) {
        // Plain prompt() for now. Cheap and works. We can swap for a polished
        // modal later if you want.
        const next = window.prompt('Rename recording', recording.name);
        if (next === null) return;                  // user cancelled
        const trimmed = next.trim();
        if (!trimmed || trimmed === recording.name) return;
        try {
            const updated = await renameRecording(recording.id, trimmed);
            setRecordings(prev => prev.map(r => (r.id === updated.id ? updated : r)));
            toast.success('Renamed');
        } catch (err) {
            toast.error(`Rename failed: ${err instanceof Error ? err.message : 'unknown error'}`);
        }
    }

    async function handleDelete(recording: RecordingMeta) {
        const ok = window.confirm(`Delete "${recording.name}"? This can't be undone.`);
        if (!ok) return;
        try {
            await deleteRecording(recording.id);
            setRecordings(prev => prev.filter(r => r.id !== recording.id));
            toast.success('Deleted');
        } catch (err) {
            toast.error(`Delete failed: ${err instanceof Error ? err.message : 'unknown error'}`);
        }
    }

    // ----- Existing helpers (unchanged) -------------------------------------

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

    function logout() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        navigate('/auth');
    }

    function goToRecordPage() {
        navigate('/home');
        setMobileMenuOpen(false);
    }

    function handleNavSelect(item: NavItem) {
        if (item === 'record') {
        goToRecordPage();
        return;
        }

        if (item === 'settings') {
        navigate('/settings');
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
        <style>{libraryStateCss}</style>

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
                    <img src={logo} alt="Hi-Five logo" style={{ width: '60px', height: '90px' }} />
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
                {navItems.map((item) => (
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
            <button style={s.newRecBtn} className="new-rec-btn" onClick={goToRecordPage}>
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
            {navItems.map((item) => (
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

        <main style={s.main} className="home-main">
            {activeNav === 'settings' ? (
            <section>
                <h1 style={s.libraryTitle}>Settings</h1>
                <p style={s.librarySubtitle}>Manage your account and preferences</p>
            </section>
            ) : (
            <section style={s.libraryWrap} className="home-library-wrap">
                <header style={s.libraryHeader} className="home-library-header">
                <div>
                    <h1 style={s.libraryTitle} className="home-library-title">Recent Recordings</h1>
                    <p style={s.librarySubtitle} className="home-library-subtitle">
                        {loading ? 'Loading...' : recordingCountLabel(recordings.length)}
                    </p>
                </div>

                <div style={s.libraryTools} className="home-library-tools">
                    <div style={s.searchWrap} className="home-library-search">
                    <Search size={16} color="#9B7355" strokeWidth={2} />
                    <input
                        style={s.searchInput}
                        placeholder="Search video..."
                        aria-label="Search video"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
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
                </div>
                </header>

                {/* States: loading / error / empty / list */}
                {loading ? (
                    <div className="home-library-state">
                        <Loader2 size={28} strokeWidth={2.2} className="home-library-spin" color="#C2410C" />
                        <p>Loading your recordings...</p>
                    </div>
                ) : loadError ? (
                    <div className="home-library-state">
                        <p>Couldn't load recordings: {loadError}</p>
                        <button type="button" className="home-library-retry-btn" onClick={load}>
                            Retry
                        </button>
                    </div>
                ) : recordings.length === 0 ? (
                    <div className="home-library-state">
                        <p style={{ fontWeight: 700, fontSize: 18, color: '#4B2A14' }}>No recordings yet</p>
                        <p style={{ marginTop: 6 }}>Your saved recordings will appear here.</p>
                        <button type="button" className="home-library-retry-btn" onClick={goToRecordPage}>
                            <PlusCircle size={16} strokeWidth={1.9} /> Start Recording
                        </button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="home-library-state">
                        <p>No recordings match "{query}"</p>
                    </div>
                ) : (
                    <div style={s.libraryGrid} className="home-library-grid">
                    {filtered.map((item, idx) => (
                        <article style={s.recordCard} className="home-record-card" key={item.id}>
                        <div style={s.recordPreview} className={`home-record-preview ${idx === 0 ? 'home-record-preview-first' : ''}`}>
                            <span style={s.durationPill}>{formatDuration(item.durationMs)}</span>
                            <button
                                style={s.deleteBtn}
                                className="home-delete-btn"
                                aria-label="Delete recording"
                                onClick={() => handleDelete(item)}
                            >
                            <Trash2 size={18} strokeWidth={2} />
                            </button>
                        </div>

                        <div style={s.recordMetaRow} className="home-record-meta-row">
                            <div style={{ minWidth: 0, flex: 1 }}>
                            <h3 style={{ ...s.recordTitle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</h3>
                            <p style={s.recordMeta}>{formatRelativeDate(item.createdAt)}</p>
                            </div>

                            <div style={s.recordActions}>
                            <button
                                style={{ ...s.recordActionBtn, ...s.playActionBtn }}
                                className="home-action-btn home-action-play"
                                onClick={() => setPlaying(item)}
                            >
                                <CirclePlay size={16} strokeWidth={2} /> Play
                            </button>
                            <button
                                style={{ ...s.recordActionBtn, ...s.editActionBtn }}
                                className="home-action-btn home-action-edit"
                                onClick={() => handleRename(item)}
                            >
                                <SlidersHorizontal size={16} strokeWidth={2} /> Edit
                            </button>
                            </div>
                        </div>
                        </article>
                    ))}
                    </div>
                )}
            </section>
            )}
        </main>

        <RecordingPlaybackModal
            recording={playing}
            onClose={() => setPlaying(null)}
        />
        </div>
    );
    }

    // CSS for the new loading/empty/error states. Co-located here so we
    // don't bloat Library.styles.ts with one-off page states.
    const libraryStateCss = `
        .home-library-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 60px 24px;
            color: #9B7355;
            font-family: 'Manrope', sans-serif;
            font-size: 14px;
            font-weight: 600;
            gap: 8px;
        }
        .home-library-state p { margin: 0; }
        .home-library-retry-btn {
            margin-top: 16px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 18px;
            background: #92400E;
            color: #fff;
            border: none;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            font-family: 'Manrope', sans-serif;
            transition: background 0.15s ease, transform 0.1s ease;
        }
        .home-library-retry-btn:hover {
            background: #7C3410;
            transform: translateY(-1px);
        }
        .home-library-spin {
            animation: home-library-spin 0.9s linear infinite;
        }
        @keyframes home-library-spin {
            to { transform: rotate(360deg); }
        }
    `;

    export default Library;