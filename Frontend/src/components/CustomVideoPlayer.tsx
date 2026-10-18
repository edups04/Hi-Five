import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Play, Pause, Volume2, VolumeX, Maximize, Minimize,
    RotateCcw, RotateCw,
} from 'lucide-react';

export const customPlayerCss = `
    .hf-player { user-select: none; }
    .hf-ctrl-btn { opacity: 0.88; transition: opacity 0.15s ease, transform 0.1s ease; }
    .hf-ctrl-btn:hover { opacity: 1; transform: scale(1.12); }
    .hf-seek { -webkit-appearance: none; appearance: none; }
    .hf-seek::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #F97316; cursor: pointer; box-shadow: 0 0 0 3px rgba(249,115,22,0.25); }
    .hf-seek::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #F97316; border: none; cursor: pointer; }
    .hf-controls { border-bottom-left-radius: inherit; border-bottom-right-radius: inherit; }
`;

interface CustomVideoPlayerProps {
    src: string;
    autoPlay?: boolean;
    /** Override border-radius on the container. Defaults to 14px. */
    borderRadius?: number | string;
}

export function CustomVideoPlayer({ src, autoPlay = false, borderRadius = 14 }: CustomVideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const seekRef = useRef<HTMLInputElement>(null);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const focused = useRef(false);

    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [buffered, setBuffered] = useState(0);

    const fmt = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const resetHideTimer = useCallback(() => {
        setShowControls(true);
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => { if (playing) setShowControls(false); }, 2500);
    }, [playing]);

    useEffect(() => { return () => { if (hideTimer.current) clearTimeout(hideTimer.current); }; }, []);

    const togglePlay = () => {
        const v = videoRef.current; if (!v) return;
        if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
        resetHideTimer();
    };

    const skip = (sec: number) => {
        const v = videoRef.current; if (!v) return;
        v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + sec));
        resetHideTimer();
    };

    const handleTimeUpdate = () => {
        const v = videoRef.current; if (!v) return;
        setCurrentTime(v.currentTime);
        if (v.buffered.length) setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = videoRef.current; if (!v) return;
        v.currentTime = Number(e.target.value);
        setCurrentTime(Number(e.target.value));
    };

    const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = videoRef.current; if (!v) return;
        const val = Number(e.target.value);
        v.volume = val; setVolume(val);
        v.muted = val === 0; setMuted(val === 0);
    };

    const toggleMute = () => {
        const v = videoRef.current; if (!v) return;
        v.muted = !v.muted; setMuted(v.muted);
    };

    const toggleFullscreen = async () => {
        const el = containerRef.current; if (!el) return;
        if (!document.fullscreenElement) {
            await el.requestFullscreen(); setFullscreen(true);
        } else {
            await document.exitFullscreen(); setFullscreen(false);
        }
    };

    useEffect(() => {
        const onFsChange = () => setFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    // Keyboard shortcuts — active when mouse is over the player or it's focused
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!focused.current) return;
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            const v = videoRef.current; if (!v) return;
            switch (e.key) {
                case ' ':
                case 'k':
                case 'K':
                    e.preventDefault();
                    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
                    resetHideTimer();
                    break;
                case 'ArrowRight':
                case 'l':
                case 'L':
                    e.preventDefault();
                    v.currentTime = Math.min(v.duration, v.currentTime + 5);
                    resetHideTimer();
                    break;
                case 'ArrowLeft':
                case 'j':
                case 'J':
                    e.preventDefault();
                    v.currentTime = Math.max(0, v.currentTime - 5);
                    resetHideTimer();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    v.volume = Math.min(1, v.volume + 0.1);
                    setVolume(v.volume); setMuted(false); v.muted = false;
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    v.volume = Math.max(0, v.volume - 0.1);
                    setVolume(v.volume);
                    break;
                case 'm':
                case 'M':
                    v.muted = !v.muted; setMuted(v.muted);
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case '0': case '1': case '2': case '3': case '4':
                case '5': case '6': case '7': case '8': case '9':
                    v.currentTime = (parseInt(e.key) / 10) * v.duration;
                    resetHideTimer();
                    break;
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [resetHideTimer]);

    const pct = duration ? (currentTime / duration) * 100 : 0;
    const radius = fullscreen ? 0 : borderRadius;

    return (
        <div
            ref={containerRef}
            tabIndex={0}
            onMouseMove={resetHideTimer}
            onMouseEnter={() => { focused.current = true; }}
            onMouseLeave={() => { focused.current = false; if (playing) setShowControls(false); }}
            onFocus={() => { focused.current = true; }}
            onBlur={() => { focused.current = false; }}
            style={{
                position: 'relative', background: '#0f0f0f',
                borderRadius: radius, overflow: 'hidden',
                aspectRatio: '16/9', cursor: showControls ? 'default' : 'none',
            }}
            className="hf-player"
        >
            <video
                ref={videoRef}
                src={src}
                autoPlay={autoPlay}
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                onLoadedMetadata={e => {
                    const v = e.target as HTMLVideoElement;
                    // Blob URLs from MediaRecorder often report Infinity duration.
                    // Seeking to a huge number forces the browser to clamp to the real end.
                    if (!isFinite(v.duration)) {
                        v.currentTime = 1e10;
                        const onSeeked = () => {
                            v.currentTime = 0;
                            setDuration(v.duration);
                            v.removeEventListener('seeked', onSeeked);
                        };
                        v.addEventListener('seeked', onSeeked);
                    } else {
                        setDuration(v.duration);
                    }
                }}
                onDurationChange={e => {
                    const v = e.target as HTMLVideoElement;
                    if (isFinite(v.duration)) setDuration(v.duration);
                }}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onClick={togglePlay}
            />

            {/* Center play overlay */}
            <div
                onClick={togglePlay}
                style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: playing ? 'none' : 'auto',
                }}
            >
                {!playing && (
                    <div style={{
                        width: 72, height: 72, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.55)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(4px)',
                    }}>
                        <Play size={32} fill="#fff" color="#fff" style={{ marginLeft: 4 }} />
                    </div>
                )}
            </div>

            {/* Controls bar */}
            <div
                className="hf-controls"
                style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)',
                    padding: '32px 16px 14px',
                    transition: 'opacity 0.25s ease',
                    opacity: showControls ? 1 : 0,
                    pointerEvents: showControls ? 'auto' : 'none',
                }}
            >
                {/* Seek bar */}
                <div style={{ position: 'relative', height: 18, display: 'flex', alignItems: 'center', marginBottom: 10, cursor: 'pointer' }}>
                    <div style={{ position: 'absolute', left: 0, right: 0, height: 4, background: 'rgba(255,255,255,0.25)', borderRadius: 999 }}>
                        <div style={{ position: 'absolute', left: 0, width: `${buffered}%`, height: '100%', background: 'rgba(255,255,255,0.4)', borderRadius: 999 }} />
                        <div style={{ position: 'absolute', left: 0, width: `${pct}%`, height: '100%', background: '#F97316', borderRadius: 999 }} />
                    </div>
                    <input
                        ref={seekRef}
                        type="range" min={0} max={duration || 0} step={0.1} value={currentTime}
                        onChange={handleSeek}
                        className="hf-seek"
                        style={{ position: 'absolute', left: 0, right: 0, width: '100%', opacity: 0, height: 18, cursor: 'pointer', margin: 0 }}
                    />
                </div>

                {/* Bottom row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={togglePlay} className="hf-ctrl-btn" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                        {playing ? <Pause size={20} fill="#fff" /> : <Play size={20} fill="#fff" />}
                    </button>
                    <button onClick={() => skip(-10)} className="hf-ctrl-btn" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                        <RotateCcw size={17} />
                    </button>
                    <button onClick={() => skip(10)} className="hf-ctrl-btn" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                        <RotateCw size={17} />
                    </button>
                    <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: "'Manrope', sans-serif", letterSpacing: '0.02em', userSelect: 'none' }}>
                        {fmt(currentTime)} / {fmt(duration)}
                    </span>

                    <div style={{ flex: 1 }} />

                    <button onClick={toggleMute} className="hf-ctrl-btn" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                        {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: 72 }}>
                        <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.25)', borderRadius: 999 }}>
                            <div style={{ width: `${(muted ? 0 : volume) * 100}%`, height: '100%', background: '#F97316', borderRadius: 999 }} />
                        </div>
                        <input
                            type="range" min={0} max={1} step={0.02} value={muted ? 0 : volume}
                            onChange={handleVolume}
                            className="hf-seek"
                            style={{ position: 'absolute', left: 0, right: 0, width: '100%', opacity: 0, height: 16, cursor: 'pointer', margin: 0 }}
                        />
                    </div>
                    <button onClick={toggleFullscreen} className="hf-ctrl-btn" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                        {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
