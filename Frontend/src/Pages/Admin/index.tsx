import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/Hi-five.png";
import { LogOut, LayoutDashboard, Users, ScrollText, Settings, Menu, X } from "lucide-react";
import { indexStyles as s, adminCss } from "../../styles/pages/Admin/index.styles";
import Overview from "./Overview";
import UserManagement from "./UserManagement";
import UserDetail from "./UserDetail";
import SystemLogs from "./SystemLogs";
import AdminSettings from "./AdminSettings";

interface SidebarProps {
  active: string;
  onNav: (p: string) => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function Sidebar({ active, onNav, onLogout, mobileOpen, onMobileClose }: SidebarProps) {
  const navItems = [
    { id: "overview",  label: "Overview",       icon: <LayoutDashboard size={18} strokeWidth={1.8} /> },
    { id: "users",     label: "User Management", icon: <Users size={18} strokeWidth={1.8} /> },
    { id: "logs",      label: "System Logs",     icon: <ScrollText size={18} strokeWidth={1.8} /> },
    { id: "settings",  label: "Settings",        icon: <Settings size={18} strokeWidth={1.8} /> },
  ];

  const sidebarContent = (onItemClick?: () => void) => (
    <>
      <div style={s.sidebarTop}>
        <div style={s.brand}>
          <img src={logo} alt="Hi-Five" style={s.brandLogo} />
          <div>
            <div style={s.brandName}>Hi-Five</div>
            <div style={s.brandSub}>ADMIN PANEL</div>
          </div>
        </div>
        <nav style={s.nav}>
          {navItems.map(item => (
            <button
              key={item.id}
              className="admin-nav-item"
              onClick={() => { onNav(item.id); onItemClick?.(); }}
              style={{ ...s.navItem, ...(active === item.id ? s.navItemActive : s.navItemInactive) }}
            >
              <span style={active === item.id ? s.navIconActive : s.navIconInactive}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>
      <div style={s.sidebarBottom}>
        <button className="admin-logout-btn" onClick={onLogout} style={s.logoutBtn}>
          <LogOut size={18} strokeWidth={1.8} /> Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="admin-sidebar" style={s.sidebar}>{sidebarContent()}</aside>
      <div className={`admin-mobile-overlay${mobileOpen ? " admin-mobile-overlay-open" : ""}`} onClick={onMobileClose} />
      <div className={`admin-mobile-drawer${mobileOpen ? " admin-mobile-drawer-open" : ""}`}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onMobileClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#7A4520" }}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        {sidebarContent(onMobileClose)}
      </div>
    </>
  );
}

export default function AdminApp() {
  const navigate = useNavigate();
  const [token] = useState(() => sessionStorage.getItem("adminToken") || "");
  const [adminUsername] = useState(() => sessionStorage.getItem("adminUsername") || "");
  const [page, setPage] = useState(() => sessionStorage.getItem("adminPage") || "overview");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!token) { navigate('/auth'); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'admin') {
        sessionStorage.removeItem('adminToken');
        navigate('/auth');
      }
    } catch {
      sessionStorage.removeItem('adminToken');
      navigate('/auth');
    }
  }, [token, navigate]);

  function handleLogout() {
      sessionStorage.removeItem("adminToken");
      sessionStorage.removeItem("adminUsername");
      sessionStorage.removeItem("adminPage");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      navigate('/auth');
  }

  function handleNav(p: string) {
    setPage(p);
    sessionStorage.setItem("adminPage", p);
    setSelectedUser(null);
    setMobileOpen(false);
  }

  if (!token) return null;

  const activeNav = selectedUser ? "users" : page;

  return (
    <div style={s.root}>
      <style>{adminCss}</style>

      <Sidebar
        active={activeNav}
        onNav={handleNav}
        onLogout={handleLogout}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={s.topbar}>
          <button className="admin-mobile-menu-btn" onClick={() => setMobileOpen(true)} style={s.mobileMenuBtn}>
            <Menu size={20} strokeWidth={2} />
          </button>
          <span style={s.topbarUsername}>{adminUsername}</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {selectedUser ? (
            <UserDetail token={token} user={selectedUser} onBack={() => setSelectedUser(null)} />
          ) : page === "overview" ? (
            <Overview token={token} />
          ) : page === "users" ? (
            <UserManagement token={token} onSelectUser={u => setSelectedUser(u)} />
          ) : page === "logs" ? (
            <SystemLogs token={token} />
          ) : page === "settings" ? (
          <AdminSettings token={token} />
                ) : null}
        </div>
      </div>
    </div>
  );
}
