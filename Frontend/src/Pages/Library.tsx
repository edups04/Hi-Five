    import { useState } from 'react';
    import { useNavigate } from 'react-router-dom';
    import logo from '../assets/Hi-five.png';
    import { libraryCss as css, libraryStyles as s } from '../styles/pages/Library.styles';
    import { CirclePlay, ListVideo, LogOut, Menu, PlusCircle, Search, Settings, SlidersHorizontal, Trash2, Video, X } from 'lucide-react';
    import { getData } from '../context/userContext';

    type NavItem = 'record' | 'library' | 'settings';

    function Library() {
    const navigate = useNavigate();
    const { user } = getData();
    const [activeNav, setActiveNav] = useState<NavItem>('library');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

        setActiveNav(item);
        setMobileMenuOpen(false);
    }

    const navItems = [
        { id: 'record' as NavItem, label: 'Record', icon: <Video size={18} strokeWidth={1.8} /> },
        { id: 'library' as NavItem, label: 'Library', icon: <ListVideo size={18} strokeWidth={1.8} /> },
        { id: 'settings' as NavItem, label: 'Settings', icon: <Settings size={18} strokeWidth={1.8} /> },
    ];

    const recordings = [
        { id: 1, title: 'Recording 1', meta: 'Yesterday · 04/14/26', duration: '04:22' },
        { id: 2, title: 'Recording 2', meta: 'Yesterday · 04/14/26', duration: '04:22' },
    ];

    return (
        <div style={s.root} className="home-root">
        <style>{css}</style>

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
                    <p style={s.librarySubtitle} className="home-library-subtitle">12 recordings total - 4 new today</p>
                </div>

                <div style={s.libraryTools} className="home-library-tools">
                    <div style={s.searchWrap} className="home-library-search">
                    <Search size={16} color="#9B7355" strokeWidth={2} />
                    <input style={s.searchInput} placeholder="Search video..." aria-label="Search video" />
                    </div>
                    {picture ? (
                    <img src={picture} alt="avatar" style={s.avatar} className="home-header-avatar" />
                    ) : (
                    <div style={s.avatarFallback} className="home-header-avatar-fallback">
                        <span style={s.avatarInitial}>{avatarInitial}</span>
                    </div>
                    )}
                </div>
                </header>

                <div style={s.libraryGrid} className="home-library-grid">
                {recordings.map((item, idx) => (
                    <article style={s.recordCard} className="home-record-card" key={item.id}>
                    <div style={s.recordPreview} className={`home-record-preview ${idx === 0 ? 'home-record-preview-first' : ''}`}>
                        <span style={s.durationPill}>{item.duration}</span>
                        <button style={s.deleteBtn} className="home-delete-btn" aria-label="Delete recording">
                        <Trash2 size={18} strokeWidth={2} />
                        </button>
                    </div>

                    <div style={s.recordMetaRow} className="home-record-meta-row">
                        <div>
                        <h3 style={s.recordTitle}>{item.title}</h3>
                        <p style={s.recordMeta}>{item.meta}</p>
                        </div>

                        <div style={s.recordActions}>
                        <button style={{ ...s.recordActionBtn, ...s.playActionBtn }} className="home-action-btn home-action-play">
                            <CirclePlay size={16} strokeWidth={2} /> Play
                        </button>
                        <button style={{ ...s.recordActionBtn, ...s.editActionBtn }} className="home-action-btn home-action-edit">
                            <SlidersHorizontal size={16} strokeWidth={2} /> Edit
                        </button>
                        </div>
                    </div>
                    </article>
                ))}
                </div>
            </section>
            )}
        </main>
        </div>
    );
    }

    export default Library;
