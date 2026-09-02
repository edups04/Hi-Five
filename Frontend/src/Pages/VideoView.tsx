import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Home, Video, ListVideo, Settings, PlusCircle,
    LogOut, ThumbsUp, Share2, Bookmark, Send,
} from 'lucide-react';
import logo from '../assets/Hi-five.png';
import { getData } from '../context/userContext';
import {
    getRecording, likeRecording, getComments, postComment,
    likeComment, viewRecording, videoUrl,
    type FeedRecording, type CommentItem,
} from '../lib/recordingsClient';
import { formatRelativeDate } from '../lib/formatters';

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
        { id: 'record', label: 'Record', icon: <Video size={18} strokeWidth={1.8} />, path: '/home' },
        { id: 'library', label: 'Library', icon: <ListVideo size={18} strokeWidth={1.8} />, path: '/library' },
        { id: 'settings', label: 'Settings', icon: <Settings size={18} strokeWidth={1.8} />, path: '/settings' },
    ];

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#FAF0E8', fontFamily: "'Manrope', sans-serif", overflow: 'hidden' }}>
            <style>{videoCss}</style>

            <aside style={{ width: 210, flexShrink: 0, background: '#FAF0E8', borderRight: '1px solid #F0D9C8', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '28px 16px 24px' }} className="video-sidebar">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4 }}>
                        <img src={logo} alt="Hi-Five" style={{ width: '60px', height: '90px' }} />
                        <div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#3B1A00', letterSpacing: "-0.01em" }}>Hi-Five</div>
                            <div style={{ fontSize: '9px', color: '#C2410C', fontWeight: 700, letterSpacing: "0.1em", marginTop: '1px' }}>SIGNING MADE VISIBLE</div>
                        </div>
                    </div>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {navItems.map(item => (
                            <button key={item.id} onClick={() => navigate(item.path)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, border: 'none', background: 'transparent', color: '#7A4520', fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: "'Manrope', sans-serif", transition: 'all 0.15s ease' }} className="video-nav-item">
                                <span style={{ color: '#C2410C' }}>{item.icon}</span>
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

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 28px 28px' }}>
                    <button onClick={() => navigate('/feed')} className="back-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#9B7355', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", marginBottom: 16, padding: 0 }}>
                        ← Back to Feed
                    </button>
                    {loading || !recording ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9B7355', fontSize: 14, fontWeight: 600 }}>Loading...</div>
                    ) : (
                        <>
                            <div style={{ background: '#1d2735', borderRadius: 20, overflow: 'hidden', marginBottom: 20, aspectRatio: '16/9', maxHeight: '55vh' }}>
                                <video
                                    src={videoUrl(recording.id)}
                                    controls
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                                />
                            </div>

                            <h1 style={{ margin: '0 0 12px', fontSize: 26, fontWeight: 800, color: '#3B1A00', letterSpacing: '-0.01em', fontFamily: "'Manrope', sans-serif" }}>{recording.name}</h1>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                                <button onClick={handleLike} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 50, border: '1.5px solid', borderColor: liked ? '#F97316' : '#E7C9B6', background: liked ? '#FFF7F0' : '#fff', color: liked ? '#F97316' : '#9B7355', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", transition: 'all 0.15s ease' }} className="like-btn">
                                    <ThumbsUp size={16} strokeWidth={2} fill={liked ? '#F97316' : 'none'} /> {likes}
                                </button>
                                <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 50, border: '1.5px solid #E7C9B6', background: '#fff', color: '#9B7355', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>
                                    <Share2 size={16} strokeWidth={2} /> Share
                                </button>
                                <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 50, border: '1.5px solid #E7C9B6', background: '#fff', color: '#9B7355', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>
                                    <Bookmark size={16} strokeWidth={2} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                <UserAvatar username={recording.uploader.username} avatar={recording.uploader.avatar} size={44} />
                                <div>
                                    <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#3B1A00', fontFamily: "'Manrope', sans-serif" }}>{recording.uploader.username}</p>
                                    <p style={{ margin: 0, fontSize: 12, color: '#9B7355', fontFamily: "'Manrope', sans-serif" }}>{recording.views} views · Posted {formatRelativeDate(recording.createdAt)}</p>
                                </div>
                            </div>

                            {recording.description && (
                                <div style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', border: '1px solid #F0D9C8' }}>
                                    <p style={{ margin: 0, fontSize: 14, color: '#3B1A00', fontFamily: "'Manrope', sans-serif", lineHeight: 1.6 }}>{recording.description}</p>
                                    {recording.tags.length > 0 && (
                                        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            {recording.tags.map(t => (
                                                <span key={t} style={{ fontSize: 13, fontWeight: 700, color: '#C2410C', fontFamily: "'Manrope', sans-serif" }}>#{t}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div style={{ width: 320, flexShrink: 0, borderLeft: '1px solid #F0D9C8', display: 'flex', flexDirection: 'column', background: '#fff', overflowY: 'hidden' }} className="video-comments-panel">
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0D9C8', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#3B1A00', fontFamily: "'Manrope', sans-serif" }}>Community Feed</span>
                        <span style={{ fontSize: 12, color: '#9B7355', fontWeight: 600 }}>{comments.length} comments</span>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {comments.length === 0 ? (
                            <p style={{ color: '#9B7355', fontSize: 13, fontFamily: "'Manrope', sans-serif", textAlign: 'center', marginTop: 24 }}>No comments yet. Be the first!</p>
                        ) : comments.map(c => {
                            const isCreator = recording && c.user.id === recording.userId;
                            const cmState = likedComments[c.id] || { likes: c.likes.length, liked: false };
                            return (
                                <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                                    <UserAvatar username={c.user.username} avatar={c.user.avatar} size={36} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                            <span style={{ fontSize: 13, fontWeight: 800, color: '#3B1A00', fontFamily: "'Manrope', sans-serif" }}>{c.user.username}</span>
                                            {isCreator && <span style={{ fontSize: 10, fontWeight: 700, background: '#92400E', color: '#fff', padding: '1px 6px', borderRadius: 4, fontFamily: "'Manrope', sans-serif" }}>CREATOR</span>}
                                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#C8A882', fontFamily: "'Manrope', sans-serif" }}>{formatRelativeDate(c.createdAt)}</span>
                                        </div>
                                        <p style={{ margin: '0 0 6px', fontSize: 13, color: '#3B1A00', fontFamily: "'Manrope', sans-serif", lineHeight: 1.5 }}>{c.text}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <button onClick={() => handleLikeComment(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: cmState.liked ? '#F97316' : '#9B7355', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", padding: 0 }}>
                                                <ThumbsUp size={13} strokeWidth={2} fill={cmState.liked ? '#F97316' : 'none'} /> {cmState.likes}
                                            </button>
                                            <button style={{ background: 'none', border: 'none', color: '#9B7355', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", padding: 0 }}>Reply</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ padding: '12px 16px', borderTop: '1px solid #F0D9C8', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {picture ? <img src={picture} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>{avatarInitial}</span></div>}
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#FAF0E8', borderRadius: 50, padding: '8px 14px', border: '1.5px solid #F0D9C8' }}>
                                <input
                                    value={commentText}
                                    onChange={e => setCommentText(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment(); } }}
                                    placeholder="Add a comment..."
                                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#3B1A00', fontFamily: "'Manrope', sans-serif" }}
                                    maxLength={1000}
                                />
                                <button onClick={handlePostComment} disabled={!commentText.trim() || posting} style={{ background: 'none', border: 'none', cursor: commentText.trim() ? 'pointer' : 'not-allowed', color: commentText.trim() ? '#F97316' : '#C8A882', padding: 0, display: 'flex', alignItems: 'center' }}>
                                    <Send size={16} strokeWidth={2} />
                                </button>
                            </div>
                        </div>
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
    @media (max-width: 900px) { .video-sidebar { display: none !important; } .video-comments-panel { width: 260px !important; } }
    @media (max-width: 640px) { .video-comments-panel { display: none !important; } }
`;