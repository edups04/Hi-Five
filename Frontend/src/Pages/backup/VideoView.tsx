import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Home, Video, ListVideo, Settings, PlusCircle,
    LogOut, ThumbsUp, Share2, Bookmark, Send, Menu, X,
} from 'lucide-react';
import { CustomVideoPlayer, customPlayerCss } from '../components/CustomVideoPlayer';
import logo from '../assets/Hi-five.png';
import { getData } from '../context/userContext';
import {
    getRecording, likeRecording, getComments, postComment,
    likeComment, viewRecording, videoUrl, getFeed,
    type FeedRecording, type CommentItem,
} from '../lib/recordingsClient';
import { formatRelativeDate, formatDuration } from '../lib/formatters';

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

function RelatedVideoCard({ rec, currentId, onClick }: { rec: FeedRecording; currentId: string; onClick: () => void }) {
    const src = videoUrl(rec.id);
    const videoRef = useRef<HTMLVideoElement>(null);
    if (rec.id === currentId) return null;
    return (
        <div onClick={onClick} className="related-card" style={{ display: 'flex', gap: 10, cursor: 'pointer', marginBottom: 10 }}>
            <div style={{ position: 'relative', width: 168, aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden', background: '#1d2735', flexShrink: 0 }}>
                <video
                    ref={videoRef}
                    src={src}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    preload="metadata"
                    muted
                    playsInline
                    onLoadedMetadata={e => { (e.target as HTMLVideoElement).currentTime = 1; }}
                />
                <span style={{ position: 'absolute', bottom: 4, right: 5, background: 'rgba(0,0,0,0.78)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3 }}>
                    {formatDuration(rec.durationMs)}
                </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 700, color: '#0f0f0f', fontFamily: "'Manrope', sans-serif", lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {rec.name}
                </h4>
                <p style={{ margin: '0 0 2px', fontSize: 12, color: '#606060', fontFamily: "'Manrope', sans-serif" }}>{rec.uploader.username}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#909090', fontFamily: "'Manrope', sans-serif" }}>{rec.views} views · {formatRelativeDate(rec.createdAt)}</p>
            </div>
        </div>
    );
}

export default function VideoView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = getData();

    const [recording, setRecording] = useState<FeedRecording | null>(null);
    const [loading, setLoading] = useState(true);
    const [likes, setLikes] = useState(0);
    const [liked, setLiked] = useState(false);
    const [comments, setComments] = useState<CommentItem[]>([]);
    const [commentText, setCommentText] = useState('');
    const [posting, setPosting] = useState(false);
    const [likedComments, setLikedComments] = useState<Record<string, { likes: number; liked: boolean }>>({});
    const [relatedVideos, setRelatedVideos] = useState<FeedRecording[]>([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const viewedRef = useRef(false);

    const userRaw = localStorage.getItem('user');
    let userObj: any = null;
    try { userObj = userRaw ? JSON.parse(userRaw) : null; } catch { userObj = null; }
    const currentUser = (user && typeof user === 'object' ? user : null) || userObj;
    const currentUserId = currentUser?._id || currentUser?.id || '';
    const picture = currentUser?.avatar || currentUser?.picture || null;
    const userName = currentUser?.username || currentUser?.name || 'Guest';
    const avatarInitial = String(userName).trim().charAt(0).toUpperCase() || 'G';

    function logout() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        navigate('/auth');
    }

    useEffect(() => {
        if (!id) return;
        viewedRef.current = false;
        setLoading(true);

        getRecording(id).then(r => {
            setRecording(r);
            setLikes(r.likes.length);
            setLiked(r.likes.includes(currentUserId));
            setLoading(false);
        }).catch(() => { navigate('/feed'); });

        getComments(id).then(c => {
            setComments(c);
            const map: Record<string, { likes: number; liked: boolean }> = {};
            c.forEach(cm => { map[cm.id] = { likes: cm.likes.length, liked: cm.likes.includes(currentUserId) }; });
            setLikedComments(map);
        }).catch(() => {});

        getFeed(1, 20).then(data => setRelatedVideos(data.recordings)).catch(() => {});
    }, [id]);

    useEffect(() => {
        if (!id || viewedRef.current) return;
        const timer = setTimeout(() => {
            viewRecording(id);
            viewedRef.current = true;
        }, 5000);
        return () => clearTimeout(timer);
    }, [id]);

    async function handleLike() {
        if (!id) return;
        const prev = { likes, liked };
        setLikes(l => liked ? l - 1 : l + 1);
        setLiked(l => !l);
        try {
            const res = await likeRecording(id);
            setLikes(res.likes);
            setLiked(res.liked);
        } catch {
            setLikes(prev.likes);
            setLiked(prev.liked);
        }
    }

    async function handlePostComment() {
        if (!id || !commentText.trim()) return;
        setPosting(true);
        try {
            const comment = await postComment(id, commentText.trim());
            setComments(prev => [comment, ...prev]);
            setLikedComments(prev => ({ ...prev, [comment.id]: { likes: 0, liked: false } }));
            setCommentText('');
        } catch {} finally {
            setPosting(false);
        }
    }

    async function handleLikeComment(commentId: string) {
        if (!id) return;
        const prev = likedComments[commentId] || { likes: 0, liked: false };
        setLikedComments(m => ({ ...m, [commentId]: { likes: prev.liked ? prev.likes - 1 : prev.likes + 1, liked: !prev.liked } }));
        try {
            const res = await likeComment(id, commentId);
            setLikedComments(m => ({ ...m, [commentId]: { likes: res.likes, liked: res.liked } }));
        } catch {
            setLikedComments(m => ({ ...m, [commentId]: prev }));
        }
    }

    const navItems = [
        { id: 'home', label: 'Home', icon: <Home size={18} strokeWidth={1.8} />, path: '/feed' },
        { id: 'record', label: 'Recording', icon: <Video size={18} strokeWidth={1.8} />, path: '/recording' },
        { id: 'library', label: 'Library', icon: <ListVideo size={18} strokeWidth={1.8} />, path: '/library' },
        { id: 'settings', label: 'Settings', icon: <Settings size={18} strokeWidth={1.8} />, path: '/settings' },
    ];

    function handleNav(path: string) {
        setDrawerOpen(false);
        navigate(path);
    }

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#FAF0E8', fontFamily: "'Manrope', sans-serif", overflow: 'hidden' }} className="video-root">
            <style>{videoCss}</style>

            {/* MOBILE OVERLAY */}
            <div
                className={`video-mobile-overlay${drawerOpen ? ' video-mobile-overlay-open' : ''}`}
                onClick={() => setDrawerOpen(false)}
            />

            {/* MOBILE SLIDE-IN DRAWER */}
            <aside className={`video-mobile-drawer${drawerOpen ? ' video-mobile-drawer-open' : ''}`}>
                <div className="video-mobile-drawer-top">
                    <button
                        type="button"
                        onClick={() => setDrawerOpen(false)}
                        style={{ background: 'none', border: '1px solid #E9CDB7', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#C2410C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        aria-label="Close menu"
                    >
                        <X size={18} strokeWidth={2} />
                    </button>
                </div>
                <nav className="video-mobile-drawer-nav">
                    {navItems.map(item => (
                        <button
                            key={`drawer-${item.id}`}
                            onClick={() => handleNav(item.path)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, border: 'none', background: 'transparent', color: '#7A4520', fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: "'Manrope', sans-serif', transition: 'all 0.15s ease" }}
                            className="video-nav-item"
                        >
                            <span style={{ color: '#C2410C' }}>{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>
                <div className="video-mobile-drawer-bottom">
                    <button
                        onClick={() => { navigate('/recording'); setDrawerOpen(false); }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#92400E', color: '#fff', border: 'none', borderRadius: 50, padding: '13px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%', fontFamily: "'Manrope', sans-serif" }}
                    >
                        <PlusCircle size={18} strokeWidth={1.8} /> New Recording
                    </button>
                    <button
                        onClick={logout}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'transparent', color: '#9B7355', border: 'none', padding: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}
>
                        <LogOut size={18} strokeWidth={1.8} /> Logout
                    </button>
                </div>
            </aside>

            {/* LEFT SIDEBAR */}
            <aside
                style={{ width: 210, flexShrink: 0, background: '#FAF0E8', borderRight: '1px solid #F0D9C8', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '28px 16px 24px' }}
                className="video-sidebar"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32, width: '100%' }} className="video-sidebar-top">

                    {/* Desktop brand — hidden on mobile */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4 }} className="video-brand-desktop">
                        <img src={logo} alt="Hi-Five" style={{ width: '60px', height: '90px' }} />
                        <div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#3B1A00', letterSpacing: '-0.01em' }}>Hi-Five</div>
                            <div style={{ fontSize: '9px', color: '#C2410C', fontWeight: 700, letterSpacing: '0.1em', marginTop: '1px' }}>SIGNING MADE VISIBLE</div>
                        </div>
                    </div>

                    {/* Mobile top row: hamburger + logo | avatar — hidden on desktop */}
                    <div className="video-mobile-top-row" style={{ display: 'none', width: '100%' }}>
                        <div className="video-mobile-left-group">
                            <button
                                type="button"
                                className="video-mobile-menu-btn"
                                onClick={() => setDrawerOpen(true)}
                                aria-label="Open menu"
                            >
                                <Menu size={20} strokeWidth={2} />
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="video-brand">
                                <img src={logo} alt="Hi-Five" style={{ width: '32px', height: '48px' }} />
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#3B1A00', letterSpacing: '-0.01em' }}>Hi-Five</div>
                                    <div style={{ fontSize: '8px', color: '#C2410C', fontWeight: 700, letterSpacing: '0.1em', marginTop: '1px', whiteSpace: 'nowrap' }}>SIGNING MADE VISIBLE</div>
                                </div>
                            </div>
                        </div>
                        <div className="video-mobile-actions">
                            <button
                                onClick={() => navigate('/settings')}
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                                aria-label="Settings"
                            >
                                {picture
                                    ? <img src={picture} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #F0D9C8' }} className="video-mobile-avatar" />
                                    : <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="video-mobile-avatar-fallback">
                                        <span style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>{avatarInitial}</span>
                                    </div>
                                }
                            </button>
                        </div>
                    </div>

                    <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }} className="video-nav">
                        {navItems.map(item => (
                            <button key={item.id} onClick={() => navigate(item.path)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, border: 'none', background: 'transparent', color: '#7A4520', fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: "'Manrope', sans-serif", transition: 'all 0.15s ease' }} className="video-nav-item">
                                <span style={{ color: '#C2410C' }}>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="video-sidebar-bottom">
                    <button onClick={() => navigate('/recording')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#92400E', color: '#fff', border: 'none', borderRadius: 50, padding: '13px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%', fontFamily: "'Manrope', sans-serif" }}>
                        <PlusCircle size={18} strokeWidth={1.8} /> New Recording
                    </button>
                    <button onClick={logout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'transparent', color: '#9B7355', border: 'none', padding: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>
                        <LogOut size={18} strokeWidth={1.8} /> Logout
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }} className="video-main">

                {/* SCROLLABLE CONTENT ROW */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                    {/* CENTER — scrollable: video + info + comments */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 40px 28px' }} className="video-main-scroll">
                        <button onClick={() => navigate('/feed')} className="back-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#9B7355', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", marginBottom: 14, padding: 0 }}>
                            ← Back to Feed
                        </button>

                        {loading || !recording ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#9B7355', fontSize: 14, fontWeight: 600 }}>Loading...</div>
                        ) : (
                            <>
                                {/* VIDEO PLAYER */}
                                <div style={{ marginBottom: 16 }}>
                                    <CustomVideoPlayer src={videoUrl(recording.id)} />
                                </div>

                                {/* TITLE */}
                                <h1 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 800, color: '#0f0f0f', letterSpacing: '-0.01em', fontFamily: "'Manrope', sans-serif", lineHeight: 1.3 }}>{recording.name}</h1>

                                {/* UPLOADER ROW + ACTIONS */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <UserAvatar username={recording.uploader.username} avatar={recording.uploader.avatar} size={38} />
                                        <div>
                                            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0f0f0f', fontFamily: "'Manrope', sans-serif" }}>{recording.uploader.username}</p>
                                            <p style={{ margin: 0, fontSize: 12, color: '#606060', fontFamily: "'Manrope', sans-serif" }}>{recording.views} views · {formatRelativeDate(recording.createdAt)}</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <button onClick={handleLike} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 50, border: '1.5px solid', borderColor: liked ? '#F97316' : '#E7C9B6', background: liked ? '#FFF7F0' : '#fff', color: liked ? '#F97316' : '#606060', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", transition: 'all 0.15s ease' }} className="like-btn">
                                            <ThumbsUp size={15} strokeWidth={2} fill={liked ? '#F97316' : 'none'} /> {likes}
                                        </button>
                                        <button style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 50, border: '1.5px solid #E7C9B6', background: '#fff', color: '#606060', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>
                                            <Share2 size={15} strokeWidth={2} /> Share
                                        </button>
                                        <button style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 50, border: '1.5px solid #E7C9B6', background: '#fff', color: '#606060', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>
                                            <Bookmark size={15} strokeWidth={2} />
                                        </button>
                                    </div>
                                </div>

                                {/* DESCRIPTION */}
                                {recording.description && (
                                    <div style={{ background: '#f2f2f2', borderRadius: 12, padding: '12px 16px', marginBottom: 24 }}>
                                        <p style={{ margin: 0, fontSize: 13, color: '#0f0f0f', fontFamily: "'Manrope', sans-serif", lineHeight: 1.6 }}>{recording.description}</p>
                                        {recording.tags.length > 0 && (
                                            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                {recording.tags.map(t => (
                                                    <span key={t} style={{ fontSize: 12, fontWeight: 700, color: '#C2410C', fontFamily: "'Manrope', sans-serif" }}>#{t}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* COMMENTS SECTION */}
                                <div style={{ borderTop: '1px solid #E5E5E5', paddingTop: 20 }}>
                                    <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 800, color: '#0f0f0f', fontFamily: "'Manrope', sans-serif" }}>
                                        {comments.length} Comment{comments.length !== 1 ? 's' : ''}
                                    </h3>

                                    {/* POST COMMENT */}
                                    <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                                        {picture
                                            ? <img src={picture} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                            : <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>{avatarInitial}</span></div>
                                        }
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 50, padding: '9px 16px', border: '1.5px solid #E7C9B6' }}>
                                                <input
                                                    value={commentText}
                                                    onChange={e => setCommentText(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment(); } }}
                                                    placeholder="Add a comment..."
                                                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#0f0f0f', fontFamily: "'Manrope', sans-serif" }}
                                                    maxLength={1000}
                                                />
                                                <button onClick={handlePostComment} disabled={!commentText.trim() || posting} style={{ background: 'none', border: 'none', cursor: commentText.trim() ? 'pointer' : 'not-allowed', color: commentText.trim() ? '#F97316' : '#C8A882', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                                    <Send size={16} strokeWidth={2} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* COMMENT LIST */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                        {comments.length === 0 ? (
                                            <p style={{ color: '#9B7355', fontSize: 13, fontFamily: "'Manrope', sans-serif", margin: 0 }}>No comments yet. Be the first!</p>
                                        ) : comments.map(c => {
                                            const isCreator = recording && c.user.id === recording.userId;
                                            const cmState = likedComments[c.id] || { likes: c.likes.length, liked: false };
                                            return (
                                                <div key={c.id} style={{ display: 'flex', gap: 12 }}>
                                                    <UserAvatar username={c.user.username} avatar={c.user.avatar} size={36} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                            <span style={{ fontSize: 13, fontWeight: 800, color: '#0f0f0f', fontFamily: "'Manrope', sans-serif" }}>{c.user.username}</span>
                                                            {isCreator && <span style={{ fontSize: 10, fontWeight: 700, background: '#92400E', color: '#fff', padding: '1px 6px', borderRadius: 4, fontFamily: "'Manrope', sans-serif" }}>CREATOR</span>}
                                                            <span style={{ marginLeft: 4, fontSize: 12, color: '#909090', fontFamily: "'Manrope', sans-serif" }}>{formatRelativeDate(c.createdAt)}</span>
                                                        </div>
                                                        <p style={{ margin: '0 0 8px', fontSize: 14, color: '#0f0f0f', fontFamily: "'Manrope', sans-serif", lineHeight: 1.5 }}>{c.text}</p>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                                            <button onClick={() => handleLikeComment(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: cmState.liked ? '#F97316' : '#606060', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", padding: 0 }}>
                                                                <ThumbsUp size={14} strokeWidth={2} fill={cmState.liked ? '#F97316' : 'none'} /> {cmState.likes}
                                                            </button>
                                                            <button style={{ background: 'none', border: 'none', color: '#606060', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", padding: 0 }}>Reply</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* RIGHT PANEL — "Up Next" related videos */}
                    <div style={{ width: 380, flexShrink: 0, borderLeft: '1px solid #F0D9C8', overflowY: 'auto', padding: '24px 16px 24px 18px', background: '#FAF0E8' }} className="video-related-panel">
                        <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 800, color: '#3B1A00', fontFamily: "'Manrope', sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase' }}>Up Next</p>
                        {relatedVideos.length === 0 ? (
                            <p style={{ fontSize: 13, color: '#9B7355', fontFamily: "'Manrope', sans-serif" }}>Loading...</p>
                        ) : relatedVideos.filter(r => r.id !== id).map(r => (
                            <RelatedVideoCard
                                key={r.id}
                                rec={r}
                                currentId={id ?? ''}
                                onClick={() => navigate(`/video/${r.id}`)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

const videoCss = `
    .video-nav-item:hover { background: rgba(249,115,22,0.12) !important; color: #C2410C !important; }
    .like-btn:hover { border-color: #F97316 !important; background: #FFF7F0 !important; color: #F97316 !important; }
    .back-btn { transition: color 0.15s ease, transform 0.15s ease; }
    .back-btn:hover { color: #C2410C !important; transform: translateX(-3px); }
    .related-card:hover h4 { color: #92400E !important; }

    ${customPlayerCss}

    /* Custom scrollbars — thin, brand-colored */
    .video-main-scroll {
        scrollbar-width: thin;
        scrollbar-color: #E2B89A #FAF0E8;
    }
    .video-main-scroll::-webkit-scrollbar { width: 6px; }
    .video-main-scroll::-webkit-scrollbar-track { background: transparent; }
    .video-main-scroll::-webkit-scrollbar-thumb { background: #E2B89A; border-radius: 999px; }
    .video-main-scroll::-webkit-scrollbar-thumb:hover { background: #C2843A; }

    .video-related-panel {
        scrollbar-width: thin;
        scrollbar-color: #E2B89A #FAF0E8;
    }
    .video-related-panel::-webkit-scrollbar { width: 6px; }
    .video-related-panel::-webkit-scrollbar-track { background: transparent; }
    .video-related-panel::-webkit-scrollbar-thumb { background: #E2B89A; border-radius: 999px; }
    .video-related-panel::-webkit-scrollbar-thumb:hover { background: #C2843A; }

    /* Mobile overlay */
    .video-mobile-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.28);
        opacity: 0; pointer-events: none;
        transition: opacity 0.2s ease;
        z-index: 30;
    }
    .video-mobile-overlay-open { opacity: 1 !important; pointer-events: auto !important; }

    /* Mobile slide-in drawer */
    .video-mobile-drawer {
        position: fixed; top: 0; left: 0; bottom: 0;
        width: min(78vw, 290px);
        background: #FAF0E8; border-right: 1px solid #EFD8C7;
        box-shadow: 8px 0 30px rgba(30,18,10,0.12);
        transform: translateX(-104%); transition: transform 0.24s ease;
        z-index: 40; display: flex; flex-direction: column;
        padding: 16px; gap: 14px;
    }
    .video-mobile-drawer-open { transform: translateX(0) !important; }
    .video-mobile-drawer-top { display: flex; justify-content: flex-end; }
    .video-mobile-drawer-nav { display: flex; flex-direction: column; gap: 8px; }
    .video-mobile-drawer-bottom { margin-top: auto; padding-top: 12px; border-top: 1px solid #efd9c8; display: flex; flex-direction: column; gap: 4px; }

    /* Breakpoints */
    @media (max-width: 1100px) {
        .video-related-panel { width: 300px !important; }
    }
    @media (max-width: 900px) {
        .video-root { flex-direction: column !important; height: auto !important; min-height: 100vh !important; overflow: auto !important; }
        .video-sidebar { width: 100% !important; border-right: none !important; border-bottom: 1px solid #F0D9C8 !important; padding: 12px 16px !important; flex-direction: row !important; justify-content: unset !important; align-items: center !important; }
        .video-sidebar-top { gap: 0 !important; }
        .video-brand-desktop { display: none !important; }
        .video-mobile-top-row { display: flex !important; align-items: center !important; justify-content: space-between !important; width: 100% !important; }
        .video-mobile-left-group { display: flex !important; align-items: center !important; gap: 10px !important; min-width: 0 !important; }
        .video-mobile-actions { display: flex !important; align-items: center !important; gap: 10px !important; }
        .video-mobile-menu-btn { display: inline-flex !important; align-items: center !important; justify-content: center !important; width: 40px !important; height: 40px !important; border-radius: 10px !important; border: 1px solid #E9CDB7 !important; background: #fff4ec !important; color: #C2410C !important; cursor: pointer !important; flex-shrink: 0 !important; }
        .video-nav { display: none !important; }
        .video-sidebar-bottom { display: none !important; }
        .video-main { overflow: visible !important; }
        .video-main-scroll { padding: 16px 16px 32px !important; overflow: visible !important; }
        .video-related-panel { width: 220px !important; }
    }
    @media (max-width: 680px) {
        .video-related-panel { display: none !important; }
    }
    @media (min-width: 901px) {
        .video-mobile-overlay, .video-mobile-drawer { display: none !important; }
    }
`;
