import { useEffect, useState } from 'react';
import { getProfile } from '../api/index.js';

// --- Inline SVGs cho các Icon ---
const GithubIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
  </svg>
);

const FigmaIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z"></path>
    <path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z"></path>
    <path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z"></path>
    <path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z"></path>
    <path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z"></path>
  </svg>
);

const PostmanIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 8v8"></path>
    <path d="M8 12h8"></path>
    <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
  </svg>
);

const DocsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const ExternalLinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
);

export default function Profile() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((body) => {
        if (!cancelled) setData(body.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="error-text">{error}</p>;
  if (!data) return <p className="empty-text">Loading profile...</p>;

  // Xử lý dữ liệu fallback nếu API chưa trả về kịp
  const name = data.name || 'Nguyễn Thành Nam';
  const studentId = data.student_id || 'B23DCCN587';
  const avatarUrl = data.avatar_url || '/avatar.jpg';

  const links = [
    { 
      id: 'github', 
      label: 'GitHub', 
      desc: '@amercer_dev', 
      url: data.github_link || '#', 
      icon: <GithubIcon /> 
    },
    { 
      id: 'figma', 
      label: 'Figma', 
      desc: 'Workspace', 
      url: data.figma_link || '#', 
      icon: <FigmaIcon /> 
    },
    { 
      id: 'postman', 
      label: 'Postman', 
      desc: 'API Collections', 
      url: data.apidocs_link || '#', 
      icon: <PostmanIcon /> 
    },
    { 
      id: 'docs', 
      label: 'Docs', 
      desc: 'Documentation', 
      url: data.baocao_link || '#', 
      icon: <DocsIcon /> 
    },
  ];

  return (
    <div className="page page-profile">
      <div className="profile-container">
        {/* Banner màu xanh */}
        <div className="profile-banner"></div>

        {/* Thông tin cá nhân */}
        <div className="profile-info-section">
          <div className="profile-avatar-wrapper">
            <img src={avatarUrl} alt="Avatar" className="profile-avatar-img" />
          </div>
          
          <h2 className="profile-title">{name}</h2>
          <p className="profile-role">Administrator</p>

          <div className="profile-id-box">
            <span className="id-label">Student ID (MSV) :</span>
            <span className="id-badge">{studentId}</span>
          </div>
        </div>

        {/* Lưới chức năng (Links) */}
        <div className="profile-links-section">
          <div className="profile-links-grid">
            {links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="link-card"
              >
                <div className="link-card-icon">{link.icon}</div>
                <div className="link-card-content">
                  <div className="link-card-title">{link.label}</div>
                  <div className="link-card-desc">{link.desc}</div>
                </div>
                <div className="link-card-external">
                  <ExternalLinkIcon />
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}