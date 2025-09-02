import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AuthContext from '../context/AuthContext';

function Profile({ getAuthHeader }) {
  const [profile, setProfile] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchProfile();
    fetchLeaderboard();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/profile', getAuthHeader());
      setProfile(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement du profil');
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get('/api/leaderboard', getAuthHeader());
      setLeaderboard(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement du classement');
    } finally {
      setLoading(false);
    }
  };

  const getBadgeStyle = (badge) => {
    const badges = {
      'early_bird': { icon: '🐦', name: 'Early Bird', class: 'badge-gold' },
      'popular': { icon: '⭐', name: 'Populaire', class: 'badge-gold' },
      'matcher': { icon: '💕', name: 'Matcher', class: 'badge-silver' },
      'truth_seeker': { icon: '🔍', name: 'Chercheur de vérité', class: 'badge-bronze' },
      'kind_heart': { icon: '💝', name: 'Cœur gentil', class: 'badge-gold' }
    };
    return badges[badge] || { icon: '🏆', name: badge, class: 'badge-bronze' };
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Chargement du profil...</p>
      </div>
    );
  }

  return (
    <div>
      {profile && (
        <div className="card" style={{ marginBottom: '30px' }}>
          <h2 style={{ marginBottom: '20px', color: '#667eea' }}>Mon Profil</h2>
          
          <div style={{ display: 'grid', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '14px', color: '#999' }}>Pseudo</label>
              <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{profile.username}</p>
            </div>
            
            <div>
              <label style={{ fontSize: '14px', color: '#999' }}>Email</label>
              <p style={{ fontSize: '16px' }}>{profile.email}</p>
            </div>
            
            <div>
              <label style={{ fontSize: '14px', color: '#999' }}>Karma</label>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
                ⭐ {profile.karma}
              </p>
            </div>
            
            <div>
              <label style={{ fontSize: '14px', color: '#999' }}>Membre depuis</label>
              <p style={{ fontSize: '16px' }}>
                {new Date(profile.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
            
            {profile.badges && profile.badges.length > 0 && (
              <div>
                <label style={{ fontSize: '14px', color: '#999' }}>Badges</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {profile.badges.map((badge, index) => {
                    const badgeInfo = getBadgeStyle(badge);
                    return (
                      <span key={index} className={`badge ${badgeInfo.class}`}>
                        {badgeInfo.icon} {badgeInfo.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: '20px', color: '#667eea' }}>🏆 Classement Karma</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {leaderboard.map((user, index) => (
            <div 
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '15px',
                background: user.username === profile?.username ? 'rgba(102, 126, 234, 0.1)' : 'rgba(0,0,0,0.02)',
                borderRadius: '10px',
                border: user.username === profile?.username ? '2px solid #667eea' : 'none'
              }}
            >
              <div style={{ 
                width: '30px', 
                height: '30px', 
                borderRadius: '50%',
                background: index === 0 ? 'linear-gradient(135deg, #FFD700, #FFA500)' :
                           index === 1 ? 'linear-gradient(135deg, #C0C0C0, #808080)' :
                           index === 2 ? 'linear-gradient(135deg, #CD7F32, #8B4513)' :
                           'rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: index < 3 ? 'white' : '#666',
                fontWeight: 'bold',
                marginRight: '15px'
              }}>
                {index + 1}
              </div>
              
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                  {user.username}
                  {user.username === profile?.username && ' (Toi)'}
                </p>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {user.badges && user.badges.slice(0, 3).map((badge, i) => {
                    const badgeInfo = getBadgeStyle(badge);
                    return <span key={i}>{badgeInfo.icon}</span>;
                  })}
                </div>
              </div>
              
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold',
                color: '#667eea'
              }}>
                ⭐ {user.karma}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Profile;
