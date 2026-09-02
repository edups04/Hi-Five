import { useState } from 'react';
import { X, Home, Video, ListVideo, Users, PartyPopper } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STEPS = [
    {
        icon: PartyPopper,
        title: 'Welcome to Hi-Five! 👋',
        body: "You've just joined a community dedicated to making sign language visible to everyone. Hi-Five uses AI to recognize ASL hand signs in real time and turn them into text captions.",
    },
    {
        icon: Video,
        title: 'Start Recording',
        body: "Head over to the Record page to start a session. Position your hand in front of the camera and sign — Hi-Five will detect each letter and build a sentence automatically. Hit Stop when you're done to save your recording.",
    },
    {
        icon: ListVideo,
        title: 'Your Library',
        body: 'All your saved recordings live in the Library. You can rename them, play them back, or delete ones you no longer need. Your library is private — only you can see it.',
    },
    {
        icon: Home,
        title: 'The Community Feed',
        body: "The Home feed is where the community shares their signing videos. Click the + button in the top bar to upload any recording from your library and make it public. Other users can like and comment on your videos.",
    },
    {
        icon: Users,
        title: "You're all set!",
        body: "That's everything you need to know to get started. Jump in, start signing, and share your progress with the community. Welcome aboard!",
    },
];

interface OnboardingModalProps {
    onClose: () => void;
    onComplete: () => void;
}

export default function OnboardingModal({ onClose, onComplete }: OnboardingModalProps) {
    const [step, setStep] = useState(0);
    const [completing, setCompleting] = useState(false);

    const isLast = step === STEPS.length - 1;
    const current = STEPS[step];
    const Icon = current.icon;

    async function handleComplete() {
        setCompleting(true);
        try {
            const token = localStorage.getItem('accessToken');
            if (token) {
                await fetch(`${API_URL}/onboarding-complete`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                });
            }
        } catch {}
        onComplete();
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, fontFamily: "'Manrope', sans-serif",
        }}>
            <div style={{
                background: '#fff', borderRadius: 24, width: '100%', maxWidth: 480,
                boxShadow: '0 24px 80px rgba(0,0,0,0.2)', overflow: 'hidden',
            }}>
                <div style={{ background: '#FAF0E8', padding: '28px 28px 20px', borderBottom: '1px solid #F0D9C8', position: 'relative' }}>
                    <button
                        onClick={onClose}
                        style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', cursor: 'pointer', color: '#C8A882', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <X size={18} strokeWidth={2} />
                    </button>

                    <div style={{ width: 52, height: 52, borderRadius: 16, background: '#F0D9C8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                        <Icon size={26} color="#C2410C" strokeWidth={1.8} />
                    </div>

                    <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#3B1A00', letterSpacing: '-0.01em' }}>{current.title}</h2>

                    <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                        {STEPS.map((_, i) => (
                            <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i <= step ? '#C2410C' : '#F0D9C8', transition: 'background 0.3s ease' }} />
                        ))}
                    </div>
                </div>

                <div style={{ padding: '24px 28px 28px' }}>
                    <p style={{ margin: '0 0 28px', fontSize: 14, color: '#7A4520', lineHeight: 1.7, fontWeight: 500 }}>{current.body}</p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#C8A882', fontWeight: 600 }}>
                            {step + 1} of {STEPS.length}
                        </span>
                        <div style={{ display: 'flex', gap: 10 }}>
                            {step > 0 && (
                                <button
                                    onClick={() => setStep(s => s - 1)}
                                    style={{ padding: '10px 20px', borderRadius: 50, border: '1px solid #E7C9B6', background: '#fff0e7', color: '#9B7355', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}
                                >
                                    ← Back
                                </button>
                            )}
                            {!isLast ? (
                                <button
                                    onClick={() => setStep(s => s + 1)}
                                    style={{ padding: '10px 24px', borderRadius: 50, border: 'none', background: '#92400E', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}
                                >
                                    Next →
                                </button>
                            ) : (
                                <button
                                    onClick={handleComplete}
                                    disabled={completing}
                                    style={{ padding: '10px 24px', borderRadius: 50, border: 'none', background: '#92400E', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Manrope', sans-serif", opacity: completing ? 0.7 : 1 }}
                                >
                                    {completing ? 'Saving...' : "Let's Go! 🎉"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
