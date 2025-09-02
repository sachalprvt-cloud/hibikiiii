import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import AuthContext from '../context/AuthContext';

function Register() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Le mot de passe doit faire au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/register', {
        email: formData.email,
        username: formData.username,
        password: formData.password
      });
      
      const { token, username, userId, karma } = response.data;
      login({ username, userId, karma: karma || 0, badges: [] }, token);
      toast.success('Bienvenue dans la communauté! 🎉');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div style={{ maxWidth: '400px', margin: '50px auto' }}>
        <div className="glass" style={{ padding: '40px' }}>
          <h1 style={{ color: 'white', textAlign: 'center', marginBottom: '30px', fontFamily: '"Libre Baskerville", serif' }}>
            haberge confest
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: '30px' }}>
            réseau anonyme
          </p>
          
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="ton.email@example.com"
                required
              />
            </div>

            <div className="input-group">
              <label>Pseudo anonyme</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Laisse vide pour pseudo aléatoire"
                minLength="3"
                maxLength="20"
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: '8px' }}
                onClick={() => setFormData(prev => ({ ...prev, username: 'random' }))}
              >
                Générer un pseudo aléatoire
              </button>
            </div>

            <div className="input-group">
              <label>Mot de passe</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                minLength="6"
                required
              />
            </div>

            <div className="input-group">
              <label>Confirmer le mot de passe</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '20px' }}
              disabled={loading}
            >
              {loading ? 'Inscription...' : 'S\'inscrire'}
            </button>
          </form>

          <p style={{ color: 'white', textAlign: 'center', marginTop: '20px' }}>
            Déjà inscrit? {' '}
            <Link to="/login" style={{ color: 'white', fontWeight: 'bold' }}>
              Connecte-toi!
            </Link>
          </p>

          {/* Section volontairement simplifiée pour souligner l'anonymat total */}
        </div>
      </div>
    </div>
  );
}

export default Register;
