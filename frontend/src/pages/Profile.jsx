import { useEffect, useState } from 'react';
import { getProfile } from '../api/index.js';
import { GithubIcon, FigmaIcon, PostmanIcon, DocsIcon, ExternalLinkIcon } from '../components/Icons.jsx';

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
  const studentId = data.msv || 'B23DCCN587';
  const avatarUrl = '/avatar.jpg';

  const links = [
    { 
      id: 'github', 
      label: 'GitHub', 
      desc: '@NamThanh102', 
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
      desc: 'BaoCao_Docx', 
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