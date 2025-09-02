import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import AuthContext from '../context/AuthContext';

function Login() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
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
    setLoading(true);

    try {
      const response = await axios.post('/api/login', formData);
      const { token, username, userId, karma, badges } = response.data;
      
      login({ username, userId, karma, badges }, token);
      toast.success(`Bienvenue ${username}! 🎉`);
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div style={{ maxWidth: '400px', margin: '100px auto' }}>
        <div className="glass" style={{ padding: '40px' }}>
          <h1 style={{ color: 'white', textAlign: 'center', marginBottom: '30px', fontFamily: '"Libre Baskerville", serif' }}>
            haberge confest
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: '30px' }}>
            réseau anonyme
          </p>
          
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Pseudo</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Ton pseudo anonyme"
                required
              />
            </div>

            <div className="input-group">
              <label>Mot de passe</label>
              <input
                type="password"
                name="password"
                value={formData.password}
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
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p style={{ color: 'white', textAlign: 'center', marginTop: '20px' }}>
            Pas encore inscrit? {' '}
            <Link to="/register" style={{ color: 'white', fontWeight: 'bold' }}>
              Rejoins-nous!
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
