import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

function Confessions({ getAuthHeader }) {
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfessions();
  }, []);

  const fetchConfessions = async () => {
    try {
      const response = await axios.get('/api/confessions', getAuthHeader());
      setConfessions(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des confessions');
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async (id) => {
    try {
      await axios.post('/api/report', {
        content_type: 'confession',
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
        <p>Chargement des confessions...</p>
      </div>
    );
  }

  if (confessions.length === 0) {
    return (
      <div className="empty-state">
        <h3>Aucune confession pour le moment</h3>
        <p>Sois le premier à partager un secret!</p>
      </div>
    );
  }

  return (
    <div>
      {confessions.map((confession) => (
        <div key={confession.id} className="card confession-card">
          <div className="confession-content">
            {confession.content}
          </div>
          <div className="card-footer">
            <span className="timestamp">
              {new Date(confession.created_at).toLocaleString('fr-FR')}
            </span>
            <div className="vote-buttons">
              <button className="vote-btn like">
                ❤️ {confession.likes}
              </button>
              <button 
                className="vote-btn dislike"
                onClick={() => handleReport(confession.id)}
              >
                🚩 Signaler
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Confessions;
