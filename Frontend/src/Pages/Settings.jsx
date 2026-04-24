import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ListVideo, Lock, LogOut, Menu, Pencil, PlusCircle, Settings as SettingsIcon, Video, X } from 'lucide-react';
import logo from '../assets/Hi-five.png';
import { getData } from '../context/userContext';
import { settingsCss as css, settingsStyles as s } from '../styles/pages/Settings.styles';

function SettingsPage() {
	const navigate = useNavigate();
	const { user } = getData();
	const [isEditing, setIsEditing] = useState(false);
	const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	function toggleShow(field) {
		setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
	}

	const currentUser = useMemo(() => {
		const userRaw = localStorage.getItem('user');

		let localUser = null;
		try {
			localUser = userRaw ? JSON.parse(userRaw) : null;
		} catch {
			localUser = null;
		}

		return (user && typeof user === 'object' ? user : null) || (localUser && typeof localUser === 'object' ? localUser : null);
	}, [user]);

	const displayName =
		currentUser?.username ||
		currentUser?.name ||
		currentUser?.given_name ||
		currentUser?.displayName ||
		currentUser?.profileObj?.name ||
		currentUser?.profileObj?.givenName ||
		'Username';

	const displayEmail =
		currentUser?.email ||
		currentUser?.profileObj?.email ||
		'name@gmail.com';

	const picture = currentUser?.picture || currentUser?.profileObj?.imageUrl || null;
	const avatarInitial = String(displayName).trim().charAt(0).toUpperCase() || 'U';

	const memberSince = useMemo(() => {
		const raw = currentUser?.createdAt;
		if (!raw) return null;
		const d = new Date(raw);
		if (isNaN(d.getTime())) return null;
		return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
	}, [currentUser]);

	const [formState, setFormState] = useState({
		username: displayName,
		email: displayEmail,
		currentPassword: '************',
		newPassword: '',
		confirmPassword: '',
	});

	function handleNav(path) {
		navigate(path);
	}

	function logout() {
		localStorage.removeItem('accessToken');
		localStorage.removeItem('user');
		navigate('/auth');
	}

	function startEditing() {
		setIsEditing(true);
	}

	function discardChanges() {
		setFormState({
			username: displayName,
			email: displayEmail,
			currentPassword: '************',
			newPassword: '',
			confirmPassword: '',
		});
		setIsEditing(false);
	}

	function saveChanges() {
		setIsEditing(false);
	}

	function onFieldChange(event) {
		const { name, value } = event.target;
		setFormState((previous) => ({ ...previous, [name]: value }));
	}

	return (
		<div style={s.root} className="settings-root">
			<style>{css}</style>

			<aside style={s.sidebar} className="settings-sidebar">
				<div style={s.sidebarTop} className="settings-sidebar-top">
					<div style={s.mobileTopRow} className="settings-mobile-top-row">
						<div className="settings-mobile-left-group">
							<button
								type="button"
								style={s.mobileMenuBtn}
								className="settings-mobile-menu-btn"
								onClick={() => setMobileMenuOpen(true)}
								aria-label="Open menu"
							>
								<Menu size={20} strokeWidth={2} />
							</button>
							<div style={s.brand} className="settings-brand">
								<img src={logo} alt="Hi-Five logo" style={{ width: '60px', height:'90px' }} />
								<div>
									<div style={s.brandName}>Hi-Five</div>
									<div style={s.brandSub}>ASL MADE VISIBLE</div>
								</div>
							</div>
						</div>
					</div>

					<nav style={s.nav} className="settings-nav">
						<button type="button" style={s.navItem} className="settings-nav-item" onClick={() => handleNav('/home')}>
							<span style={{ color: '#C2410C' }}><Video size={18} strokeWidth={1.8} /></span> Record
						</button>
						<button type="button" style={s.navItem} className="settings-nav-item" onClick={() => handleNav('/library')}>
							<span style={{ color: '#C2410C' }}><ListVideo size={18} strokeWidth={1.8} /></span> Library
						</button>
						<button type="button" style={{ ...s.navItem, ...s.navItemActive }} className="settings-nav-item">
							<span style={{ color: '#fff' }}><SettingsIcon size={18} strokeWidth={1.8} /></span> Settings
						</button>
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

			<div
				className={`settings-mobile-overlay${mobileMenuOpen ? ' settings-mobile-overlay-open' : ''}`}
				onClick={() => setMobileMenuOpen(false)}
			/>

			<aside className={`settings-mobile-drawer${mobileMenuOpen ? ' settings-mobile-drawer-open' : ''}`}>
				<div className="settings-mobile-drawer-top">
					<button
						type="button"
						style={s.mobileMenuBtn}
						className="settings-mobile-menu-btn"
						onClick={() => setMobileMenuOpen(false)}
						aria-label="Close menu"
					>
						<X size={20} strokeWidth={2} />
					</button>
				</div>
				<nav className="settings-mobile-drawer-nav">
					<button type="button" style={s.navItem} className="settings-nav-item" onClick={() => { handleNav('/home'); setMobileMenuOpen(false); }}>
						<span style={{ color: '#C2410C' }}><Video size={18} strokeWidth={1.8} /></span> Record
					</button>
					<button type="button" style={s.navItem} className="settings-nav-item" onClick={() => { handleNav('/library'); setMobileMenuOpen(false); }}>
						<span style={{ color: '#C2410C' }}><ListVideo size={18} strokeWidth={1.8} /></span> Library
					</button>
					<button type="button" style={{ ...s.navItem, ...s.navItemActive }} className="settings-nav-item">
						<span style={{ color: '#fff' }}><SettingsIcon size={18} strokeWidth={1.8} /></span> Settings
					</button>
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
						{picture ? (
							<img src={picture} alt="Profile" style={s.profileImage} />
						) : (
							<div style={s.profileFallback}>{avatarInitial}</div>
						)}
						<button type="button" style={s.imageEditBtn} aria-label="Edit profile image">
							<Pencil size={16} strokeWidth={2.2} />
						</button>
					</div>

					<div style={s.profileTextWrap}>
						<h2 style={s.profileName} className="settings-profile-name">{formState.username}</h2>
						<p style={s.profileMeta} className="settings-profile-meta">{memberSince ? `MEMBER SINCE ${memberSince}` : 'MEMBER SINCE APRIL 2026'}</p>
					</div>
				</section>

				<section style={s.formCard}>
					<div style={s.section}>
						<h3 style={s.sectionHeader}>General Information</h3>
						<div style={s.inputGrid} className="settings-input-grid">
							<div style={s.field}>
								<label htmlFor="username" style={s.label}>Username</label>
								<input
									id="username"
									name="username"
									style={s.input}
									className="settings-input"
									value={formState.username}
									onChange={onFieldChange}
									readOnly={!isEditing}
								/>
							</div>

							<div style={s.field}>
								<label htmlFor="email" style={s.label}>Email Address</label>
								<div style={s.inputLockedWrap}>
									<input
										id="email"
										name="email"
										style={{ ...s.input, paddingRight: '36px' }}
										className="settings-input"
										value={formState.email}
										onChange={onFieldChange}
										readOnly
									/>
									<Lock size={14} strokeWidth={2} style={s.lockIcon} />
								</div>
							</div>
						</div>
					</div>

					<hr style={s.divider} />

					<div style={s.section}>
						<h3 style={s.sectionHeader}>Update Password</h3>
						<div style={s.inputGrid} className="settings-input-grid">
							<div style={{ ...s.field, gridColumn: '1 / -1' }}>
								<label htmlFor="currentPassword" style={s.label}>Current Password</label>
								<div style={s.passwordWrap}>
									<input
										id="currentPassword"
										name="currentPassword"
										style={{ ...s.input, paddingRight: '36px' }}
										className="settings-input"
										type={showPasswords.current ? 'text' : 'password'}
										value={formState.currentPassword}
										onChange={onFieldChange}
										readOnly={!isEditing}
									/>
									<button type="button" style={s.eyeBtn} onClick={() => toggleShow('current')} tabIndex={-1} aria-label="Toggle password visibility">
										{showPasswords.current ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
									</button>
								</div>
							</div>

							{isEditing && (
								<>
									<div style={s.field}>
										<label htmlFor="newPassword" style={s.label}>New Password</label>
										<div style={s.passwordWrap}>
											<input
												id="newPassword"
												name="newPassword"
												style={{ ...s.input, paddingRight: '36px' }}
												className="settings-input"
												type={showPasswords.new ? 'text' : 'password'}
												value={formState.newPassword}
												onChange={onFieldChange}
											/>
											<button type="button" style={s.eyeBtn} onClick={() => toggleShow('new')} tabIndex={-1} aria-label="Toggle password visibility">
												{showPasswords.new ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
											</button>
										</div>
									</div>

									<div style={s.field}>
										<label htmlFor="confirmPassword" style={s.label}>Confirm New Password</label>
										<div style={s.passwordWrap}>
											<input
												id="confirmPassword"
												name="confirmPassword"
												style={{ ...s.input, paddingRight: '36px' }}
												className="settings-input"
												type={showPasswords.confirm ? 'text' : 'password'}
												value={formState.confirmPassword}
												onChange={onFieldChange}
											/>
											<button type="button" style={s.eyeBtn} onClick={() => toggleShow('confirm')} tabIndex={-1} aria-label="Toggle password visibility">
												{showPasswords.confirm ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
											</button>
										</div>
									</div>
								</>
							)}
						</div>
					</div>

					<div style={s.actions} className="settings-actions">
						{isEditing ? (
							<>
								<button
									type="button"
									style={s.actionBtn}
									className="settings-secondary-btn"
									onClick={discardChanges}
								>
									Discard Changes
								</button>

								<button
									type="button"
									style={{ ...s.actionBtn, ...s.actionBtnPrimary }}
									className="settings-primary-btn"
									onClick={saveChanges}
								>
									Save Changes
								</button>
							</>
						) : (
							<button
								type="button"
								style={{ ...s.actionBtn, ...s.actionBtnPrimary }}
								className="settings-primary-btn"
								onClick={startEditing}
							>
								<span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
									<Pencil size={14} strokeWidth={2.5} /> Edit Profile
								</span>
							</button>
						)}
					</div>
				</section>

				<section style={s.dangerCard} className="settings-danger-card">
					<div>
						<h3 style={s.dangerTitle} className="settings-danger-title">Deactivate Account</h3>
						<p style={s.dangerText} className="settings-danger-text">This will permanently remove your recorded library and profile.</p>
					</div>
					<button type="button" style={s.actionBtnDanger} className="settings-danger-btn">
						Delete Account
					</button>
				</section>
			</main>
		</div>
	);
}

export default SettingsPage;
