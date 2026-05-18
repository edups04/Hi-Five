import { useMemo, useRef, useState } from 'react';
import { Camera, Eye, EyeOff, Lock, Phone } from 'lucide-react';
import { settingsStyles as s, settingsCss as css } from '../../styles/pages/Settings.styles';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const PASSWORD_RULES = [
    { key: 'length',  label: 'At least 8 characters',         test: (p: string) => p.length >= 8 },
    { key: 'upper',   label: 'At least one uppercase letter',  test: (p: string) => /[A-Z]/.test(p) },
    { key: 'lower',   label: 'At least one lowercase letter',  test: (p: string) => /[a-z]/.test(p) },
    { key: 'number',  label: 'At least one number',            test: (p: string) => /[0-9]/.test(p) },
    { key: 'special', label: 'At least one special character', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

function passwordValid(p: string) { return PASSWORD_RULES.every(r => r.test(p)); }

export default function AdminSettings({ token }: { token: string }) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [editingProfile, setEditingProfile] = useState(false);
    const [editingPassword, setEditingPassword] = useState(false);
    const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
    const [usernameInput, setUsernameInput] = useState('');
    const [phoneInput, setPhoneInput] = useState('');
    const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [profileStatus, setProfileStatus] = useState<{ text: string; ok: boolean } | null>(null);
    const [passwordStatus, setPasswordStatus] = useState<{ text: string; ok: boolean } | null>(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [newPasswordTouched, setNewPasswordTouched] = useState(false);

    const adminUser = useMemo(() => {
        try {
            const raw = localStorage.getItem('user');
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }, []);

    const displayName = adminUser?.username || adminUser?.name || adminUser?.displayName || 'Admin';
    const displayEmail = adminUser?.email || '';
    const displayPhone = adminUser?.phone || '';
    const picture = adminUser?.avatar || adminUser?.picture || null;
    const avatarInitial = String(displayName).trim().charAt(0).toUpperCase() || 'A';
    const isGoogleUser = !!adminUser?.googleId;
    const avatarSrc = previewAvatar || picture;

    const memberSince = useMemo(() => {
        const raw = adminUser?.createdAt;
        if (!raw) return null;
        const d = new Date(raw);
        if (isNaN(d.getTime())) return null;
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
    }, [adminUser]);

    function startEditingProfile() {
        setUsernameInput(displayName);
        setPhoneInput(displayPhone.replace('+63', ''));
        setPreviewAvatar(null);
        setProfileStatus(null);
        setEditingProfile(true);
    }

    function cancelEditingProfile() {
        setEditingProfile(false);
        setPreviewAvatar(null);
        setProfileStatus(null);
    }

    function startEditingPassword() {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswords({ current: false, new: false, confirm: false });
        setPasswordStatus(null);
        setEditingPassword(true);
    }

    function cancelEditingPassword() {
        setEditingPassword(false);
        setPasswordStatus(null);
        setNewPasswordTouched(false);
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setProfileStatus({ text: 'Image too large. Max 5MB.', ok: false }); return; }
        const reader = new FileReader();
        reader.onload = (evt) => {
            const base64 = evt.target?.result as string;
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX = 300;
                let w = img.width, h = img.height;
                if (w > h) { h = Math.round((h / w) * MAX); w = MAX; }
                else { w = Math.round((w / h) * MAX); h = MAX; }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
                setPreviewAvatar(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = base64;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }

    async function saveProfile() {
        if (!token) { setProfileStatus({ text: 'Session expired.', ok: false }); return; }
        setSavingProfile(true);
        try {
            const body: Record<string, string> = {};
            if (usernameInput.trim() && usernameInput.trim() !== displayName) body.username = usernameInput.trim();
            if (previewAvatar) body.avatar = previewAvatar;
            const newPhone = phoneInput.trim() ? `+63${phoneInput.trim()}` : '';
            if (newPhone !== displayPhone) body.phone = newPhone;
            if (Object.keys(body).length === 0) { cancelEditingProfile(); return; }
            const res = await fetch(`${API_URL}/update-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success) {
                const updated = { ...adminUser, ...data.user };
                localStorage.setItem('user', JSON.stringify(updated));
                setProfileStatus({ text: 'Profile updated successfully.', ok: true });
                setTimeout(() => { setEditingProfile(false); setProfileStatus(null); setPreviewAvatar(null); }, 1000);
            } else {
                setProfileStatus({ text: data.message || 'Failed to update profile.', ok: false });
            }
        } catch {
            setProfileStatus({ text: 'Network error. Please try again.', ok: false });
        } finally {
            setSavingProfile(false);
        }
    }

    async function savePassword() {
        const { currentPassword, newPassword, confirmPassword } = passwordForm;
        if (!currentPassword) { setPasswordStatus({ text: 'Please enter your current password.', ok: false }); return; }
        if (!newPassword) { setPasswordStatus({ text: 'Please enter a new password.', ok: false }); return; }
        if (newPassword !== confirmPassword) { setPasswordStatus({ text: 'New passwords do not match.', ok: false }); return; }
        if (!passwordValid(newPassword)) { setPasswordStatus({ text: 'New password does not meet requirements.', ok: false }); return; }
        if (!token) { setPasswordStatus({ text: 'Session expired.', ok: false }); return; }
        setSavingPassword(true);
        try {
            const res = await fetch(`${API_URL}/update-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();
            if (data.success) {
                setPasswordStatus({ text: 'Password updated successfully.', ok: true });
                setTimeout(() => { setEditingPassword(false); setPasswordStatus(null); setNewPasswordTouched(false); }, 1000);
            } else {
                setPasswordStatus({ text: data.message || 'Failed to update password.', ok: false });
            }
        } catch {
            setPasswordStatus({ text: 'Network error. Please try again.', ok: false });
        } finally {
            setSavingPassword(false);
        }
    }

    return (
        <div style={s.main} className="settings-main">
            <style>{css}</style>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

            <div style={s.topBar}>
                <h1 style={s.pageTitle} className="settings-page-title">Settings</h1>
            </div>

            <section style={s.profileCard} className="settings-profile-card">
                <div style={s.profileImageWrap}>
                    {avatarSrc ? (
                        <img src={avatarSrc} alt="Profile" style={s.profileImage} />
                    ) : (
                        <div style={s.profileFallback}>{avatarInitial}</div>
                    )}
                    {editingProfile && (
                        <button type="button" onClick={() => fileInputRef.current?.click()} style={s.imageEditBtn} aria-label="Change photo">
                            <Camera size={16} strokeWidth={2.2} />
                        </button>
                    )}
                </div>
                <div style={s.profileTextWrap}>
                    <h2 style={s.profileName} className="settings-profile-name">{displayName}</h2>
                    <p style={s.profileMeta} className="settings-profile-meta">{memberSince ? `MEMBER SINCE ${memberSince}` : 'ADMIN'}</p>
                    <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                        {!editingProfile && !editingPassword && (
                            <button type="button" onClick={startEditingProfile}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 50, border: 'none', background: '#B45309', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}
                                className="settings-primary-btn"
                            >
                                Edit Profile
                            </button>
                        )}
                        {!isGoogleUser && !editingProfile && !editingPassword && (
                            <button type="button" onClick={startEditingPassword}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 50, border: '1px solid #E7C9B6', background: '#fff0e7', color: '#9B7355', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}
                                className="settings-secondary-btn"
                            >
                                <Lock size={14} strokeWidth={2.5} /> Change Password
                            </button>
                        )}
                    </div>
                </div>
            </section>

            <section style={s.formCard}>
                <div style={s.section}>
                    <h3 style={{ ...s.sectionHeader, margin: '0 0 12px' }}>General Information</h3>
                    <div style={s.inputGrid} className="settings-input-grid">
                        <div style={s.field}>
                            <label style={s.label}>Username</label>
                            {editingProfile ? (
                                <input style={{ ...s.input, border: '1.5px solid #F97316' }} className="settings-input" value={usernameInput} onChange={e => setUsernameInput(e.target.value)} placeholder="Enter username" autoFocus />
                            ) : (
                                <input style={s.input} className="settings-input" value={displayName} readOnly />
                            )}
                        </div>
                        <div style={s.field}>
                            <label style={s.label}>Email Address</label>
                            <div style={s.inputLockedWrap}>
                                <input style={{ ...s.input, paddingRight: '36px' }} className="settings-input" value={displayEmail} readOnly />
                                <Lock size={14} strokeWidth={2} style={s.lockIcon} />
                            </div>
                        </div>
                        <div style={s.field}>
                            <label style={s.label}>Phone Number <span style={{ fontSize: 10, color: '#C8A882', fontWeight: 600 }}>(optional)</span></label>
                            {editingProfile ? (
                                <div style={{ display: 'flex', alignItems: 'center', background: '#F6E3D8', border: '1.5px solid #F97316', borderRadius: 10, overflow: 'hidden', minHeight: 44 }}>
                                    <span style={{ padding: '0 8px 0 12px', fontSize: 13, fontWeight: 700, color: '#9B7355', borderRight: '1px solid #F0D9C8', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                        <Phone size={14} color="#C2410C" strokeWidth={1.8} /> +63
                                    </span>
                                    <input
                                        style={{ ...s.input, border: 'none', borderRadius: 0, background: 'transparent', paddingLeft: 10 }}
                                        className="settings-input"
                                        type="tel"
                                        placeholder="9XXXXXXXXX (optional)"
                                        value={phoneInput}
                                        onChange={e => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        maxLength={10}
                                    />
                                </div>
                            ) : (
                                <input style={s.input} className="settings-input" value={displayPhone ? displayPhone.replace('+63', '+63 ') : 'Not set'} readOnly />
                            )}
                        </div>
                    </div>

                    {profileStatus && (
                        <p style={{ margin: '10px 0 0', fontSize: 13, fontWeight: 600, color: profileStatus.ok ? '#16a34a' : '#dc2626' }}>
                            {profileStatus.text}
                        </p>
                    )}

                    {editingProfile && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }} className="settings-actions">
                            <button type="button" style={s.actionBtn} className="settings-secondary-btn" onClick={cancelEditingProfile} disabled={savingProfile}>Discard Changes</button>
                            <button type="button" style={{ ...s.actionBtn, ...s.actionBtnPrimary, opacity: savingProfile ? 0.7 : 1 }} className="settings-primary-btn" onClick={saveProfile} disabled={savingProfile}>
                                {savingProfile ? 'Saving…' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>

                {!editingProfile && <hr style={s.divider} />}

                <div style={s.section}>
                    <h3 style={s.sectionHeader}>Password</h3>
                    {editingPassword ? (
                        <>
                            <div style={s.inputGrid} className="settings-input-grid">
                                <div style={{ ...s.field, gridColumn: '1 / -1' }}>
                                    <label style={s.label}>Current Password</label>
                                    <div style={s.passwordWrap}>
                                        <input
                                            style={{ ...s.input, border: '1.5px solid #F97316', paddingRight: 36 }}
                                            className="settings-input"
                                            type={showPasswords.current ? 'text' : 'password'}
                                            value={passwordForm.currentPassword}
                                            onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                                            placeholder="Enter current password"
                                            autoFocus
                                        />
                                        <button type="button" style={s.eyeBtn} onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))}>
                                            {showPasswords.current ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                                        </button>
                                    </div>
                                </div>
                                <div style={s.field}>
                                    <label style={s.label}>New Password</label>
                                    <div style={s.passwordWrap}>
                                        <input
                                            style={{ ...s.input, border: '1.5px solid #F97316', paddingRight: 36 }}
                                            className="settings-input"
                                            type={showPasswords.new ? 'text' : 'password'}
                                            value={passwordForm.newPassword}
                                            onChange={e => { setPasswordForm(p => ({ ...p, newPassword: e.target.value })); setNewPasswordTouched(true); }}
                                            placeholder="Enter new password"
                                        />
                                        <button type="button" style={s.eyeBtn} onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}>
                                            {showPasswords.new ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                                        </button>
                                    </div>
                                </div>
                                <div style={s.field}>
                                    <label style={s.label}>Confirm New Password</label>
                                    <div style={s.passwordWrap}>
                                        <input
                                            style={{ ...s.input, border: '1.5px solid #F97316', paddingRight: 36 }}
                                            className="settings-input"
                                            type={showPasswords.confirm ? 'text' : 'password'}
                                            value={passwordForm.confirmPassword}
                                            onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                                            placeholder="Confirm new password"
                                        />
                                        <button type="button" style={s.eyeBtn} onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}>
                                            {showPasswords.confirm ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                                        </button>
                                    </div>
                                </div>
                                {newPasswordTouched && passwordForm.newPassword.length > 0 && (
                                    <div style={{ gridColumn: '1 / -1', marginTop: 4, padding: "10px 14px", background: "#FAF0E8", borderRadius: 10, border: "1px solid #F0D9C8", display: "flex", flexDirection: "column", gap: 5 }}>
                                        {PASSWORD_RULES.map(rule => {
                                            const passed = rule.test(passwordForm.newPassword);
                                            return (
                                                <div key={rule.key} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                                    <span style={{ width: 16, height: 16, borderRadius: "50%", background: passed ? "#16a34a" : "#F0D9C8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s ease" }}>
                                                        {passed && <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                                    </span>
                                                    <span style={{ fontSize: 12, fontWeight: 600, color: passed ? "#16a34a" : "#9B7355", fontFamily: "'Manrope', sans-serif", transition: "color 0.2s ease" }}>{rule.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            {passwordStatus && (
                                <p style={{ margin: '10px 0 0', fontSize: 13, fontWeight: 600, color: passwordStatus.ok ? '#16a34a' : '#dc2626' }}>
                                    {passwordStatus.text}
                                </p>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }} className="settings-actions">
                                <button type="button" style={s.actionBtn} className="settings-secondary-btn" onClick={cancelEditingPassword} disabled={savingPassword}>Discard Changes</button>
                                <button type="button" style={{ ...s.actionBtn, ...s.actionBtnPrimary, opacity: savingPassword ? 0.7 : 1 }} className="settings-primary-btn" onClick={savePassword} disabled={savingPassword}>
                                    {savingPassword ? 'Saving…' : 'Update Password'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={s.inputGrid} className="settings-input-grid">
                            <div style={{ ...s.field, gridColumn: '1 / -1' }}>
                                <label style={s.label}>Current Password</label>
                                <input style={s.input} className="settings-input" type="password" value="••••••••••••" readOnly />
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
