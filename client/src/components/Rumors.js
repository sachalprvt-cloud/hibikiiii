import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

function Rumors({ getAuthHeader }) {
  const [rumors, setRumors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRumors();
  }, []);

  const fetchRumors = async () => {
    try {
      const response = await axios.get('/api/rumors', getAuthHeader());
      setRumors(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des rumeurs');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (rumorId, voteType) => {
    try {
      await axios.post(`/api/rumors/${rumorId}/vote`, 
        { vote: voteType }, 
        getAuthHeader()
      );
      toast.success('Vote enregistré!');
      fetchRumors(); // Refresh
    } catch (error) {
      toast.error('Erreur lors du vote');
    }
  };

  const handleReport = async (id) => {
    try {
      await axios.post('/api/report', {
        content_type: 'rumor',
        content_id: id,
        reason: 'Contenu inapproprié'
      }, getAuthHeader());
      toast.success('Signalement enregistré');
    } catch (error) {
      toast.error('Erreur lors du signalement');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Chargement des rumeurs...</p>
      </div>
    );
  }

  if (rumors.length === 0) {
    return (
      <div className="empty-state">
        <h3>Aucune rumeur pour le moment</h3>
        <p>Qu'est-ce qui se dit dans les couloirs?</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '30px', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
        <h2 style={{ color: 'white', marginBottom: '10px' }}>🗣️ Vérité ou Intox?</h2>
        <p style={{ color: 'rgba(255,255,255,0.9)' }}>
          Vote pour dire si c'est vrai ou faux. La communauté décide!
        </p>
      </div>

      {rumors.map((rumor) => {
        const totalVotes = rumor.true_votes + rumor.false_votes;
        const truePercentage = totalVotes > 0 ? (rumor.true_votes / totalVotes * 100).toFixed(0) : 50;
        
        return (
          <div key={rumor.id} className="card rumor-card">
            <div className="rumor-content">
              {rumor.content}
            </div>
            
            {rumor.source && (
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                Source: {rumor.source}
              </p>
            )}

            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '12px', color: '#4CAF50' }}>
                  Vrai {truePercentage}%
                </span>
                <span style={{ fontSize: '12px', color: '#F44336' }}>
                  Faux {100 - truePercentage}%
                </span>
              </div>
              <div style={{ 
                height: '8px', 
                background: '#F44336', 
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  width: `${truePercentage}%`, 
                  height: '100%', 
                  background: '#4CAF50',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
            </div>

            <div className="card-footer">
              <span className="timestamp">
                {new Date(rumor.created_at).toLocaleString('fr-FR')}
              </span>
              <div className="vote-buttons">
                <button 
                  className="vote-btn like"
                  onClick={() => handleVote(rumor.id, 'true')}
                  disabled={rumor.user_vote}
                >
                  ✅ Vrai ({rumor.true_votes})
                </button>
                <button 
                  className="vote-btn dislike"
                  onClick={() => handleVote(rumor.id, 'false')}
                  disabled={rumor.user_vote}
                >
                  ❌ Faux ({rumor.false_votes})
                </button>
                <button 
                  className="vote-btn"
                  onClick={() => handleReport(rumor.id)}
                  style={{ background: 'rgba(255,152,0,0.1)', color: '#FF9800' }}
                >
                  🚩
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Rumors;
