import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import AuthContext from '../context/AuthContext';
import Feed from './Feed';
import Profile from './Profile';
import AdminPanel from './AdminPanel';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('feed');
  const [showModal, setShowModal] = useState(false);
  const [sortBy, setSortBy] = useState('new');
  const [content, setContent] = useState('');
  const { user, logout } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [hasAdmin, setHasAdmin] = useState(false);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    // Socket listeners
    newSocket.on('new-post', () => {
      toast('Nouveau post!', { icon: '🔥' });
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // detect admin access by pinging admin endpoint
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const token = localStorage.getItem('token');
        await axios.get('/api/admin/reports', { headers: { Authorization: `Bearer ${token}` } });
        setHasAdmin(true);
      } catch {
        setHasAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  const karmaColor = useMemo(() => {
    const k = user.karma || 0;
    if (k >= 500) return '#f59e0b'; // gold
    if (k >= 200) return '#8b5cf6'; // purple
    if (k >= 100) return '#ef4444'; // red
    return '#9ca3af';
  }, [user.karma]);

  const handleLogout = () => {
    logout();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/posts', 
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Confession postée!');
      setContent('');
      setShowModal(false);
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur');
    }
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'feed':
        return <Feed sortBy={sortBy} />;
      case 'profile':
        return <Profile />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <Feed sortBy={sortBy} />;
    }
  };

  return (
    <div>
      <div className="navbar">
        <div className="navbar-content">
          <h1>H.C</h1>
          <div className="user-info">
            <span className="karma">⭐ {user.karma}</span>
            <span className="username">@{user.username}</span>
            {user.is_admin && <span className="badge">Admin</span>}
            <button onClick={handleLogout} className="btn btn-secondary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveTab('feed')}
          >
            🔥 Feed
          </button>
          <button 
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profil
          </button>
          {hasAdmin && (
            <button 
              className={`tab ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              🛡️ Admin
            </button>
          )}
          <div className="sort-buttons" style={{marginLeft: 'auto', display: 'flex', gap: '10px'}}>
            <button 
              className={`btn btn-secondary ${sortBy === 'new' ? 'active' : ''}`}
              onClick={() => setSortBy('new')}
              style={{padding: '8px 16px', fontSize: '14px'}}
            >
              Nouveau
            </button>
            <button 
              className={`btn btn-secondary ${sortBy === 'hot' ? 'active' : ''}`}
              onClick={() => setSortBy('hot')}
              style={{padding: '8px 16px', fontSize: '14px'}}
            >
              Hot
            </button>
            <button 
              className={`btn btn-secondary ${sortBy === 'controversial' ? 'active' : ''}`}
              onClick={() => setSortBy('controversial')}
              style={{padding: '8px 16px', fontSize: '14px'}}
            >
              Controversé
            </button>
          </div>
        </div>

        <div className="content">
          {renderContent()}
        </div>
      </div>

      <button 
        className="floating-btn"
        onClick={() => setShowModal(true)}
        title="Nouveau post"
      >
        +
      </button>

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouvelle confession</h2>
              <button className="close-btn" onClick={() => setShowModal(false)} style={{color: '#666'}}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label style={{color: '#999'}}>Confession anonyme</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows="4"
                  placeholder="Partage ton secret..."
                  style={{background: 'rgba(0,0,0,0.5)', color: '#e5e5e5', border: '1px solid rgba(255,255,255,0.1)'}}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Poster
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
