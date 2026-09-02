import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Video, ListVideo, Settings, PlusCircle, LogOut, X, Bell, LayoutGrid, List, Search, ThumbsUp } from 'lucide-react';
import logo from '../assets/Hi-five.png';
import { getData } from '../context/userContext';
import { getFeed, listRecordings, publishRecording, videoUrl, type FeedRecording, type RecordingMeta } from '../lib/recordingsClient';
import { formatRelativeDate, formatDuration } from '../lib/formatters';
import OnboardingModal from '../components/OnboardingModal';

type NavItem = 'home' | 'record' | 'library' | 'settings';

const FILTERS = ['All Feed', 'Greetings', 'Basic Signs', 'Numbers', 'Emotions', 'Emergency Signs'];

function UserAvatar({ username, avatar, size = 36 }: { username: string; avatar: string | null; size?: number }) {
    if (avatar) return <img src={avatar} alt={username} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
    const initial = (username || '?').charAt(0).toUpperCase();
    const colors = ['#F97316', '#C2410C', '#92400E', '#B45309', '#D97706'];
    const color = colors[initial.charCodeAt(0) % colors.length];
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontSize: size * 0.4, fontWeight: 800, fontFamily: "'Manrope', sans-serif" }}>{initial}</span>
        </div>
    );
}

function VideoCard({ recording, onClick, listView }: { recording: FeedRecording; onClick: () => void; listView: boolean }) {
    const src = videoUrl(recording.id);

    if (listView) {
        return (
            <div onClick={onClick} style={{ display: 'flex', gap: 16, background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #F0D9C8', cursor: 'pointer', padding: 12, alignItems: 'center', transition: 'box-shadow 0.15s ease' }} className="feed-card">
                <div style={{ position: 'relative', width: 160, height: 90, flexShrink: 0, borderRadius: 10, overflow: 'hidden', background: '#1d2735' }}>
                    <video src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preload="metadata" muted playsInline onLoadedMetadata={e => { (e.target as HTMLVideoElement).currentTime = 1; }} />
                    <span style={{ position: 'absolute', bottom: 6, right: 6, background: '#92400E', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6 }}>{formatDuration(recording.durationMs)}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: '#3B1A00', fontFamily: "'Manrope', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recording.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <UserAvatar username={recording.uploader.username} avatar={recording.uploader.avatar} size={22} />
                        <span style={{ fontSize: 13, color: '#9B7355', fontFamily: "'Manrope', sans-serif", fontWeight: 600 }}>{recording.uploader.username}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#C8A882', fontFamily: "'Manrope', sans-serif" }}>{recording.views} views</span>
                        <span style={{ fontSize: 12, color: '#C8A882' }}>·</span>
                        <span style={{ fontSize: 12, color: '#C8A882', fontFamily: "'Manrope', sans-serif" }}>{formatRelativeDate(recording.createdAt)}</span>
                        <span style={{ fontSize: 12, color: '#C8A882' }}>·</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#C8A882', fontFamily: "'Manrope', sans-serif" }}><ThumbsUp size={12} strokeWidth={2} /> {recording.likes.length}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div onClick={onClick} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #F0D9C8', cursor: 'pointer', transition: 'box-shadow 0.15s ease, transform 0.15s ease' }} className="feed-card">
            <div style={{ position: 'relative', height: 180, background: '#1d2735', overflow: 'hidden' }}>
                <video src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preload="metadata" muted playsInline onLoadedMetadata={e => { (e.target as HTMLVideoElement).currentTime = 1; }} />
                <span style={{ position: 'absolute', bottom: 8, right: 8, background: '#92400E', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>{formatDuration(recording.durationMs)}</span>
            </div>
            <div style={{ padding: '12px 14px 14px' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <UserAvatar username={recording.uploader.username} avatar={recording.uploader.avatar} size={36} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <h3 style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 800, color: '#3B1A00', fontFamily: "'Manrope', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recording.name}</h3>
                        <p style={{ margin: '0 0 2px', fontSize: 12, color: '#9B7355', fontFamily: "'Manrope', sans-serif", fontWeight: 600 }}>{recording.uploader.username}</p>
                        <p style={{ margin: 0, fontSize: 11, color: '#C8A882', fontFamily: "'Manrope', sans-serif" }}>{recording.views} views · {formatRelativeDate(recording.createdAt)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PublishModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [recordings, setRecordings] = useState<RecordingMeta[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        listRecordings().then(list => {
            setRecordings(list.filter(r => !r.isPublic));
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    async function handlePublish() {
        if (!selected) { setError('Please select a recording.'); return; }
        setPublishing(true);
        setError(null);
        try {
            await publishRecording(selected, description, []);
            onSuccess();
        } catch {
            setError('Failed to publish. Please try again.');
            setPublishing(false);
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480, fontFamily: "'Manrope', sans-serif", boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#3B1A00' }}>Upload to Feed</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B7355', padding: 4 }}><X size={20} strokeWidth={2} /></button>
                </div>

                <p style={{ margin: '0 0 14px', fontSize: 13, color: '#9B7355', fontWeight: 600 }}>Select a recording from your library to make public:</p>

                <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {loading ? (
                        <p style={{ color: '#9B7355', fontSize: 13 }}>Loading your recordings...</p>
                    ) : recordings.length === 0 ? (
                        <p style={{ color: '#9B7355', fontSize: 13 }}>No private recordings to upload. All recordings are already public or you have none.</p>
                    ) : recordings.map(r => (
                        <div key={r.id} onClick={() => setSelected(r.id)} style={{ padding: '10px 14px', borderRadius: 12, border: `2px solid ${selected === r.id ? '#F97316' : '#F0D9C8'}`, background: selected === r.id ? '#FFF7F0' : '#FAF0E8', cursor: 'pointer', transition: 'all 0.15s ease' }}>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#3B1A00' }}>{r.name}</p>
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9B7355' }}>{formatDuration(r.durationMs)} · {formatRelativeDate(r.createdAt)}</p>
                        </div>
                    ))}
                </div>

                {selected && (
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#9B7355', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Description (optional)</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Describe your signing video..."
                            maxLength={2000}
                            rows={3}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #F0D9C8', background: '#FAF0E8', fontSize: 13, fontFamily: "'Manrope', sans-serif", color: '#3B1A00', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>
                )}

                {error && <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#dc2626' }}>{error}</p>}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 50, border: '1px solid #E7C9B6', background: '#fff0e7', color: '#9B7355', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>Cancel</button>
                    <button onClick={handlePublish} disabled={!selected || publishing} style={{ padding: '10px 20px', borderRadius: 50, border: 'none', background: selected ? '#92400E' : '#F0D9C8', color: '#fff', fontWeight: 700, fontSize: 13, cursor: selected ? 'pointer' : 'not-allowed', fontFamily: "'Manrope', sans-serif", opacity: publishing ? 0.7 : 1 }}>
                        {publishing ? 'Publishing…' : 'Publish to Feed'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function FeedPage() {
    const navigate = useNavigate();
    const { user } = getData();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All Feed');
    const [listView, setListView] = useState(false);
    const [search, setSearch] = useState('');
    const [recordings, setRecordings] = useState<FeedRecording[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPublish, setShowPublish] = useState(false);

    const userRaw = localStorage.getItem('user');
    let userObj: any = null;
    try { userObj = userRaw ? JSON.parse(userRaw) : null; } catch { userObj = null; }
    const currentUser = (user && typeof user === 'object' ? user : null) || userObj;
    const picture = currentUser?.avatar || currentUser?.picture || null;
    const userName = currentUser?.username || currentUser?.name || 'Guest';
    const avatarInitial = String(userName).trim().charAt(0).toUpperCase() || 'G';

    function logout() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        navigate('/auth');
    }

    useEffect(() => {
        getFeed(1, 24).then(data => {
            setRecordings(data.recordings);
            setLoading(false);
        }).catch(() => setLoading(false));

        try {
            const raw = localStorage.getItem('user');
            const u = raw ? JSON.parse(raw) : null;
            if (u && !u.hasSeenOnboarding) {
                setShowOnboarding(true);
            }
        } catch {}
    }, []);

    const filtered = recordings.filter(r =>
        !search.trim() || r.name.toLowerCase().includes(search.toLowerCase()) || r.uploader.username.toLowerCase().includes(search.toLowerCase())
    );

    const navItems = [
        { id: 'home' as NavItem, label: 'Home', icon: <HomeIcon size={18} strokeWidth={1.8} />, path: '/feed' },
        { id: 'record' as NavItem, label: 'Recording', icon: <Video size={18} strokeWidth={1.8} />, path: '/recording' },
        { id: 'library' as NavItem, label: 'Library', icon: <ListVideo size={18} strokeWidth={1.8} />, path: '/library' },
        { id: 'settings' as NavItem, label: 'Settings', icon: <Settings size={18} strokeWidth={1.8} />, path: '/settings' },
    ];

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#FAF0E8', fontFamily: "'Manrope', sans-serif", overflow: 'hidden' }}>
            <style>{feedCss}</style>

            <aside style={{ width: 210, flexShrink: 0, background: '#FAF0E8', borderRight: '1px solid #F0D9C8', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '28px 16px 24px' }} className="feed-sidebar">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4 }}>
                        <img src={logo} alt="Hi-Five" style={{ width: '60px', height: '90px' }} />
                        <div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#3B1A00', letterSpacing: '-0.01em' }}>Hi-Five</div>
                            <div style={{ fontSize: '9px', color: '#C2410C', fontWeight: 700, letterSpacing: '0.1em', marginTop: '1px', whiteSpace: 'nowrap' }}>SIGNING MADE VISIBLE</div>
                        </div>
                    </div>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {navItems.map(item => (
                            <button key={item.id} onClick={() => navigate(item.path)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, border: 'none', background: item.id === 'home' ? '#F97316' : 'transparent', color: item.id === 'home' ? '#fff' : '#7A4520', fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: "'Manrope', sans-serif", transition: 'all 0.15s ease' }} className="feed-nav-item">
                                <span style={{ color: item.id === 'home' ? '#fff' : '#C2410C' }}>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button onClick={() => navigate('/home')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#92400E', color: '#fff', border: 'none', borderRadius: 50, padding: '13px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%', fontFamily: "'Manrope', sans-serif" }}>
                        <PlusCircle size={18} strokeWidth={1.8} /> New Recording
                    </button>
                    <button onClick={logout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'transparent', color: '#9B7355', border: 'none', padding: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>
                        <LogOut size={18} strokeWidth={1.8} /> Logout
                    </button>
                </div>
            </aside>

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '16px 28px', borderBottom: '1px solid #F0D9C8', display: 'flex', alignItems: 'center', gap: 16, background: '#FAF0E8', flexShrink: 0 }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1.5px solid #F0D9C8', borderRadius: 50, padding: '10px 18px' }}>
                        <Search size={16} color="#9B7355" strokeWidth={2} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search communities, videos, or creators..." style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#3B1A00', fontFamily: "'Manrope', sans-serif", background: 'transparent' }} />
                    </div>
                    <button style={{ width: 40, height: 40, borderRadius: '50%', border: '1.5px solid #F0D9C8', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9B7355' }}>
                        <Bell size={18} strokeWidth={1.8} />
                    </button>
                    <button onClick={() => setShowPublish(true)} style={{ width: 40, height: 40, borderRadius: '50%', border: '1.5px solid #F0D9C8', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9B7355' }}>
                        <PlusCircle size={18} strokeWidth={1.8} />
                    </button>
                    <button onClick={() => navigate('/settings')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                        {picture ? <img src={picture} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #F0D9C8' }} /> : <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#fff', fontSize: 16, fontWeight: 800 }}>{avatarInitial}</span></div>}
                    </button>
                </div>

                <div style={{ padding: '14px 28px 10px', borderBottom: '1px solid #F0D9C8', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
                    {FILTERS.map(f => (
                        <button key={f} onClick={() => setActiveFilter(f)} style={{ padding: '8px 18px', borderRadius: 50, border: '1.5px solid', borderColor: activeFilter === f ? '#92400E' : '#E7C9B6', background: activeFilter === f ? '#92400E' : '#fff', color: activeFilter === f ? '#fff' : '#9B7355', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", transition: 'all 0.15s ease' }}>
                            {f}
                        </button>
                    ))}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#3B1A00', fontFamily: "'Manrope', sans-serif" }}>Uploaded Videos</h2>
                        <div style={{ display: 'flex', gap: 4, background: '#fff', border: '1.5px solid #F0D9C8', borderRadius: 10, padding: 4 }}>
                            <button onClick={() => setListView(false)} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: !listView ? '#92400E' : 'transparent', color: !listView ? '#fff' : '#9B7355', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s ease' }}>
                                <LayoutGrid size={16} strokeWidth={2} />
                            </button>
                            <button onClick={() => setListView(true)} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: listView ? '#92400E' : 'transparent', color: listView ? '#fff' : '#9B7355', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s ease' }}>
                                <List size={16} strokeWidth={2} />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#9B7355', fontSize: 14, fontWeight: 600 }}>Loading feed...</div>
                    ) : filtered.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: '#9B7355', gap: 8 }}>
                            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#4B2A14' }}>No videos yet</p>
                            <p style={{ margin: 0, fontSize: 13 }}>Be the first to upload a signing video!</p>
                            <button onClick={() => setShowPublish(true)} style={{ marginTop: 8, padding: '10px 20px', borderRadius: 50, border: 'none', background: '#92400E', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>Upload Video</button>
                        </div>
                    ) : (
                        <div style={listView ? { display: 'flex', flexDirection: 'column', gap: 12 } : { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="feed-grid">
                            {filtered.map(r => (
                                <VideoCard key={r.id} recording={r} listView={listView} onClick={() => navigate(`/video/${r.id}`)} />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {showPublish && (
                <PublishModal
                    onClose={() => setShowPublish(false)}
                    onSuccess={() => {
                        setShowPublish(false);
                        setLoading(true);
                        getFeed(1, 24).then(data => { setRecordings(data.recordings); setLoading(false); }).catch(() => setLoading(false));
                    }}
                />
            )}

            {showOnboarding && (
                <OnboardingModal
                    onClose={() => setShowOnboarding(false)}
                    onComplete={() => {
                        setShowOnboarding(false);
                        try {
                            const raw = localStorage.getItem('user');
                            const u = raw ? JSON.parse(raw) : null;
                            if (u) {
                                u.hasSeenOnboarding = true;
                                localStorage.setItem('user', JSON.stringify(u));
                            }
                        } catch {}
                    }}
                />
            )}
        </div>
    );
}

const feedCss = `
    .feed-card:hover { box-shadow: 0 8px 24px rgba(64,34,12,0.12); transform: translateY(-2px); }
    .feed-nav-item:hover { background: rgba(249,115,22,0.12) !important; color: #C2410C !important; }
    @media (max-width: 1100px) { .feed-grid { grid-template-columns: repeat(2, 1fr) !important; } }
    @media (max-width: 700px) { .feed-grid { grid-template-columns: 1fr !important; } .feed-sidebar { display: none !important; } }
`;