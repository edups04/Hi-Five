import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Eye, EyeOff, Home as HomeIcon, ListVideo, Lock, LogOut, Menu, Pencil, Phone, PlusCircle, Settings as SettingsIcon, Video, X } from 'lucide-react';
import logo from '../assets/Hi-five.png';
import { getData } from '../context/userContext';
import { settingsCss as css, settingsStyles as s } from '../styles/pages/Settings.styles';
import { clearTrustedDevice } from './LoginSignup';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

type NavItem = 'home' | 'record' | 'library' | 'settings';

interface UserProfile {
	username?: string;
	name?: string;
	given_name?: string;
	displayName?: string;
	email?: string;
	picture?: string;
	avatar?: string;
	googleId?: string;
	createdAt?: string;
	phone?: string;
	_id?: string;
	profileObj?: { name?: string; givenName?: string; email?: string; imageUrl?: string; };
}

const PASSWORD_RULES = [
	{ key: 'length',  label: 'At least 8 characters',         test: (p: string) => p.length >= 8 },
	{ key: 'upper',   label: 'At least one uppercase letter',  test: (p: string) => /[A-Z]/.test(p) },
	{ key: 'lower',   label: 'At least one lowercase letter',  test: (p: string) => /[a-z]/.test(p) },
	{ key: 'number',  label: 'At least one number',            test: (p: string) => /[0-9]/.test(p) },
	{ key: 'special', label: 'At least one special character', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

function passwordValid(p: string) {
	return PASSWORD_RULES.every(r => r.test(p));
}

function SettingsPage() {
	const navigate = useNavigate();
	const { user, setUser } = getData();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [newPasswordTouched, setNewPasswordTouched] = useState(false);
	const [deactivationSuccess, setDeactivationSuccess] = useState(false);

	const currentUser = useMemo<UserProfile | null>(() => {
		const userRaw = localStorage.getItem('user');
		let localUser: UserProfile | null = null;
		try { localUser = userRaw ? JSON.parse(userRaw) : null; } catch { localUser = null; }
		return (user && typeof user === 'object' ? user as UserProfile : null) || (localUser && typeof localUser === 'object' ? localUser : null);
	}, [user]);

	const displayName = currentUser?.username || currentUser?.name || currentUser?.given_name || currentUser?.displayName || currentUser?.profileObj?.name || currentUser?.profileObj?.givenName || 'Username';
	const displayEmail = currentUser?.email || currentUser?.profileObj?.email || 'name@gmail.com';
	const displayPhone = currentUser?.phone || '';
	const picture = currentUser?.avatar || currentUser?.picture || currentUser?.profileObj?.imageUrl || null;
	const avatarInitial = String(displayName).trim().charAt(0).toUpperCase() || 'U';
	const isGoogleUser = !!currentUser?.googleId;

	const memberSince = useMemo(() => {
		const raw = currentUser?.createdAt;
		if (!raw) return null;
		const d = new Date(raw);
		if (isNaN(d.getTime())) return null;
		return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
	}, [currentUser]);

	const avatarSrc = previewAvatar || picture;

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

	function handleAvatarClick() { fileInputRef.current?.click(); }

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		if (file.size > 5 * 1024 * 1024) {
			setProfileStatus({ text: 'Image too large. Max 5MB.', ok: false });
			return;
		}
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
		const token = localStorage.getItem('accessToken');
		if (!token) { setProfileStatus({ text: 'Session expired. Please log in again.', ok: false }); return; }
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
				const updated = { ...currentUser, ...data.user };
				localStorage.setItem('user', JSON.stringify(updated));
				setUser(updated);
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
		const token = localStorage.getItem('accessToken');
		if (!token) { setPasswordStatus({ text: 'Session expired. Please log in again.', ok: false }); return; }
		setSavingPassword(true);
		try {
			const res = await fetch(`${API_URL}/update-password`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
				body: JSON.stringify({ currentPassword, newPassword }),
			});
			const data = await res.json();
			if (data.success) {
				if (currentUser?._id) clearTrustedDevice(currentUser._id);
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

	async function requestDeactivation() {
		const token = localStorage.getItem('accessToken');
		if (!token) return;
		setDeleting(true);
		setDeleteError(null);
		try {
			const res = await fetch(`${API_URL}/request-deactivation`, {
				method: 'POST',
				headers: { 'Authorization': `Bearer ${token}` },
			});
			const data = await res.json();
			if (data.success) {
				setDeactivationSuccess(true);
				setDeleting(false);
				setTimeout(() => {
					setDeactivationSuccess(false);
					setShowDeleteModal(false);
				}, 3000);
			} else {
				setDeleteError(data.message || 'Failed to submit request.');
				setDeleting(false);
			}
		} catch {
			setDeleteError('Network error. Please try again.');
			setDeleting(false);
		}
	}

	function handleNav(path: string) { navigate(path); }

	function logout() {
		localStorage.removeItem('accessToken');
		localStorage.removeItem('user');
		navigate('/auth');
	}

	const navItems = [
		{ id: 'home' as NavItem, label: 'Home', icon: <HomeIcon size={18} strokeWidth={1.8} />, path: '/feed', active: false },
		{ id: 'record' as NavItem, label: 'Recording', icon: <Video size={18} strokeWidth={1.8} />, path: '/recording', active: false },
		{ id: 'library' as NavItem, label: 'Library', icon: <ListVideo size={18} strokeWidth={1.8} />, path: '/library', active: false },
		{ id: 'settings' as NavItem, label: 'Settings', icon: <SettingsIcon size={18} strokeWidth={1.8} />, path: '/settings', active: true },
	];

	return (
		<div style={s.root} className="settings-root">
			<style>{css}</style>

			<input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

			<aside style={s.sidebar} className="settings-sidebar">
				<div style={s.sidebarTop} className="settings-sidebar-top">
					<div style={s.mobileTopRow} className="settings-mobile-top-row">
						<div className="settings-mobile-left-group">
							<button type="button" style={s.mobileMenuBtn} className="settings-mobile-menu-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
								<Menu size={20} strokeWidth={2} />
							</button>
							<div style={s.brand} className="settings-brand">
								<img src={logo} alt="Hi-Five logo" style={{ width: '60px', height: '90px' }} />
								<div>
									<div style={s.brandName}>Hi-Five</div>
									<div style={s.brandSub}>SIGNING MADE VISIBLE</div>
								</div>
							</div>
						</div>
					</div>
					<nav style={s.nav} className="settings-nav">
						{navItems.map(item => (
							<button key={item.label} type="button"
								style={{ ...s.navItem, ...(item.active ? s.navItemActive : {}) }}
								className="settings-nav-item"
								onClick={() => !item.active && handleNav(item.path)}
							>
								<span style={{ color: item.active ? '#fff' : '#C2410C' }}>{item.icon}</span>
								{item.label}
							</button>
						))}
					</nav>
				</div>
				<div style={s.sidebarBottom} className="settings-sidebar-bottom">
					<button type="button" style={s.newRecBtn} className="settings-new-recording-btn" onClick={() => handleNav('/home')}>
						<PlusCircle size={18} strokeWidth={1.8} /> New Recording
					</button>
					<button type="button" style={s.logoutBtn} className="settings-logout-btn" onClick={logout}>
						<LogOut size={18} strokeWidth={1.8} /> Logout
					</button>
				</div>
			</aside>

			<div className={`settings-mobile-overlay${mobileMenuOpen ? ' settings-mobile-overlay-open' : ''}`} onClick={() => setMobileMenuOpen(false)} />

			<aside className={`settings-mobile-drawer${mobileMenuOpen ? ' settings-mobile-drawer-open' : ''}`}>
				<div className="settings-mobile-drawer-top">
					<button type="button" style={s.mobileMenuBtn} className="settings-mobile-menu-btn" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
						<X size={20} strokeWidth={2} />
					</button>
				</div>
				<nav className="settings-mobile-drawer-nav">
					{navItems.map(item => (
						<button key={`m-${item.label}`} type="button"
							style={{ ...s.navItem, ...(item.active ? s.navItemActive : {}) }}
							className="settings-nav-item"
							onClick={() => { if (!item.active) { handleNav(item.path); setMobileMenuOpen(false); } }}
						>
							<span style={{ color: item.active ? '#fff' : '#C2410C' }}>{item.icon}</span>
							{item.label}
						</button>
					))}
				</nav>
				<div className="settings-mobile-drawer-bottom">
					<button type="button" style={{ ...s.logoutBtn, justifyContent: 'flex-start', padding: '11px 14px' }} className="settings-logout-btn" onClick={logout}>
						<LogOut size={18} strokeWidth={1.8} /> Logout
					</button>
				</div>
			</aside>

			<main style={s.main} className="settings-main">
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
							<button type="button" onClick={handleAvatarClick} style={s.imageEditBtn} aria-label="Change photo">
								<Camera size={16} strokeWidth={2.2} />
							</button>
						)}
					</div>
					<div style={s.profileTextWrap}>
						<h2 style={s.profileName} className="settings-profile-name">{displayName}</h2>
						<p style={s.profileMeta} className="settings-profile-meta">{memberSince ? `MEMBER SINCE ${memberSince}` : 'MEMBER SINCE APRIL 2026'}</p>
						<div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
							{!editingProfile && !editingPassword && (
								<button type="button" onClick={startEditingProfile}
									style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 50, border: 'none', background: '#B45309', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}
									className="settings-primary-btn"
								>
									<Pencil size={14} strokeWidth={2.5} /> Edit Profile
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
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
							<h3 style={{ ...s.sectionHeader, margin: 0 }}>General Information</h3>
						</div>
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
									<input
										style={s.input}
										className="settings-input"
										value={displayPhone ? displayPhone.replace('+63', '+63 ') : 'Not set'}
										readOnly
									/>
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
															{passed && (
																<svg width="9" height="9" viewBox="0 0 9 9" fill="none">
																	<path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
																</svg>
															)}
														</span>
														<span style={{ fontSize: 12, fontWeight: 600, color: passed ? "#16a34a" : "#9B7355", fontFamily: "'Manrope', sans-serif", transition: "color 0.2s ease" }}>
															{rule.label}
														</span>
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

				<section style={s.dangerCard} className="settings-danger-card">
					<div>
						<h3 style={s.dangerTitle}>Deactivate Account</h3>
						<p style={s.dangerText}>Submit a request to deactivate your account. An admin will review and process it.</p>
					</div>
					<button type="button" style={s.actionBtnDanger} className="settings-danger-btn" onClick={() => setShowDeleteModal(true)}>
						Deactivate
					</button>
				</section>
			</main>

				{showDeleteModal && (
					<div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
						onClick={() => { if (!deleting && !deactivationSuccess) setShowDeleteModal(false); }}
					>
						<div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, fontFamily: "'Manrope', sans-serif", boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
							onClick={e => e.stopPropagation()}
						>
							{deactivationSuccess ? (
								<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: '8px 0' }}>
									<div style={{ width: 52, height: 52, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
										<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
											<path d="M5 13L9 17L19 7" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
										</svg>
									</div>
									<h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#3B1A00', letterSpacing: '-0.01em' }}>Request Submitted</h2>
									<p style={{ margin: 0, fontSize: 14, color: '#9B7355', fontWeight: 600, lineHeight: 1.5 }}>
										Your deactivation request has been submitted. An admin will review and process it shortly.
									</p>
								</div>
							) : (
								<>
									<h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#D9480F', letterSpacing: '-0.01em' }}>Request Account Deactivation</h2>
									<p style={{ margin: '0 0 20px', fontSize: 14, color: '#9B7355', fontWeight: 600, lineHeight: 1.5 }}>
										Your deactivation request will be sent to an admin for review. Your account will remain active until the admin processes it.
									</p>
									{deleteError && <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#dc2626' }}>{deleteError}</p>}
									<div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
										<button type="button" onClick={() => setShowDeleteModal(false)} disabled={deleting}
											style={{ padding: '10px 20px', borderRadius: 50, border: '1px solid #E7C9B6', background: '#fff0e7', color: '#9B7355', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}>
											Cancel
										</button>
										<button type="button" onClick={requestDeactivation} disabled={deleting}
											style={{ padding: '10px 20px', borderRadius: 50, border: 'none', background: '#DC2626', color: '#fff', fontWeight: 700, fontSize: 13, cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: "'Manrope', sans-serif", opacity: deleting ? 0.7 : 1 }}>
											{deleting ? 'Submitting…' : 'Yes, Request Deactivation'}
										</button>
									</div>
								</>
							)}
						</div>
					</div>
				)}
		</div>
	);
}

export default SettingsPage;