import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

function Compliments({ getAuthHeader }) {
  const [compliments, setCompliments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompliments();
  }, []);

  const fetchCompliments = async () => {
    try {
      const response = await axios.get('/api/compliments/my', getAuthHeader());
      setCompliments(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des compliments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Chargement des compliments...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '30px', background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
        <h2 style={{ color: 'white', marginBottom: '10px' }}>✨ Mur des Compliments</h2>
        <p style={{ color: 'rgba(255,255,255,0.9)' }}>
          Répands la positivité! Envoie des compliments anonymes.
        </p>
      </div>

      {compliments.length > 0 ? (
        <div>
          <h3 style={{ color: 'white', marginBottom: '20px' }}>Tes compliments reçus 💝</h3>
          {compliments.map((compliment) => (
            <div key={compliment.id} className="card compliment-card">
              <div style={{ display: 'flex', gap: '15px' }}>
                <span style={{ fontSize: '24px' }}>💝</span>
                <div style={{ flex: 1 }}>
                  <div className="compliment-content">
                    {compliment.content}
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#999' }}>
                    {compliment.is_anonymous ? 'Anonyme' : `De ${compliment.from_username}`} • {' '}
                    {new Date(compliment.created_at).toLocaleString('fr-FR')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>Pas encore de compliments</h3>
          <p>Sois gentil avec les autres et tu recevras de la gentillesse en retour! 🌟</p>
        </div>
      )}
    </div>
  );
}

export default Compliments;
