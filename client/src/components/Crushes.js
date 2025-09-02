import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

function Crushes({ getAuthHeader }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await axios.get('/api/crushes/my', getAuthHeader());
      setMatches(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des matchs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Chargement des matchs...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '30px' }}>
        <h2 style={{ color: 'white', marginBottom: '10px' }}>💕 Crush Match</h2>
        <p style={{ color: 'rgba(255,255,255,0.8)' }}>
          Déclare ton crush anonymement. Si c'est réciproque, c'est un match!
        </p>
      </div>

      {matches.length > 0 ? (
        <div>
          <h3 style={{ color: 'white', marginBottom: '20px' }}>Tes matchs 💕</h3>
          {matches.map((match) => (
            <div key={match.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>💕</span>
                <div>
                  <p style={{ fontWeight: 'bold', color: '#e5e7eb' }}>
                    Match avec {match.to_username}!
                  </p>
                  {match.message && (
                    <p style={{ marginTop: '5px', color: '#666' }}>{match.message}</p>
                  )}
                  <span className="timestamp">
                    {new Date(match.created_at).toLocaleString('fr-FR')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>Pas encore de match</h3>
          <p>Déclare tes crushs, peut-être que c'est réciproque! 😊</p>
        </div>
      )}
    </div>
  );
}

export default Crushes;
