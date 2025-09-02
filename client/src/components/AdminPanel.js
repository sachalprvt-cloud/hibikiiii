import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'users' | 'ip_bans'
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [ipBans, setIpBans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // id currently acted on
  const [newIp, setNewIp] = useState('');
  const [newReason, setNewReason] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(res.data || []);
    } catch (e) {
      toast.error("Impossible de charger les signalements");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setSubLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data || []);
    } catch (e) {
      toast.error('Chargement des utilisateurs échoué');
    } finally {
      setSubLoading(false);
    }
  }, []);

  const fetchIpBans = useCallback(async () => {
    setSubLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/ip-bans', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIpBans(res.data || []);
    } catch (e) {
      toast.error('Chargement des IP bannies échoué');
    } finally {
      setSubLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
    fetchUsers();
    fetchIpBans();
  }, [fetchReports, fetchUsers, fetchIpBans]);

  const toggleHide = async (postId, currentHidden) => {
    try {
      setActionLoading(postId);
      const token = localStorage.getItem('token');
      await axios.post(`/api/admin/posts/${postId}/hide`, { hide: currentHidden ? 0 : 1 }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(currentHidden ? 'Post ré-affiché' : 'Post masqué');
      fetchReports();
    } catch (e) {
      toast.error('Action échouée');
    } finally {
      setActionLoading(null);
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm('Supprimer définitivement ce post et ses données ?')) return;
    try {
      setActionLoading(postId);
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Post supprimé');
      setReports(prev => prev.filter(r => r.post_id !== postId));
    } catch (e) {
      toast.error('Suppression échouée');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleUserBan = async (userId, currentBanned) => {
    try {
      setActionLoading(`user-${userId}`);
      const token = localStorage.getItem('token');
      await axios.post(`/api/admin/users/${userId}/ban`, { ban: currentBanned ? 0 : 1 }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(currentBanned ? 'Utilisateur débanni' : 'Utilisateur banni');
      fetchUsers();
    } catch (e) {
      toast.error('Action échouée');
    } finally {
      setActionLoading(null);
    }
  };

  const addIpBan = async () => {
    if (!newIp.trim()) return toast.error('IP requise');
    try {
      setActionLoading('add-ip');
      const token = localStorage.getItem('token');
      await axios.post('/api/admin/ip-bans', { ip: newIp.trim(), reason: newReason || '' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('IP bannie');
      setNewIp('');
      setNewReason('');
      fetchIpBans();
    } catch (e) {
      toast.error("Ajout du ban IP échoué");
    } finally {
      setActionLoading(null);
    }
  };

  const removeIpBan = async (ip) => {
    if (!window.confirm(`Retirer le ban pour ${ip} ?`)) return;
    try {
      setActionLoading(`ip-${ip}`);
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/ip-bans/${encodeURIComponent(ip)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ban IP retiré');
      setIpBans(prev => prev.filter(b => b.ip !== ip));
    } catch (e) {
      toast.error('Suppression échouée');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: '0 0 12px 0' }}>Administration</h2>

      <div className="tabs" style={{ marginBottom: 16 }}>
        <button
          className={`tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >Signalements</button>
        <button
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >Utilisateurs</button>
        <button
          className={`tab ${activeTab === 'ip_bans' ? 'active' : ''}`}
          onClick={() => setActiveTab('ip_bans')}
        >Bans IP</button>
      </div>

      {activeTab === 'reports' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <button className="btn btn-secondary" onClick={fetchReports} disabled={loading}>
              Rafraîchir
            </button>
          </div>
          {loading ? (
            <div style={{ color: '#9ca3af' }}>Chargement des signalements...</div>
          ) : reports.length === 0 ? (
            <div style={{ color: '#9ca3af' }}>Aucun signalement.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {reports.map((r) => (
                <div key={r.id} style={{
                  background: '#1a1a1a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  padding: 12
                }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ color: '#9ca3af', fontSize: 12 }}>Post #{r.post_id}</div>
                    <div style={{ marginLeft: 'auto', color: r.is_hidden ? '#ef4444' : '#10b981', fontSize: 12 }}>
                      {r.is_hidden ? 'Masqué' : 'Visible'}
                    </div>
                  </div>
                  <div style={{ color: '#e5e5e5', margin: '8px 0' }}>{r.content}</div>
                  <div style={{ color: '#9ca3af', fontSize: 12 }}>Raison: {r.reason || '—'} • {new Date(r.created_at).toLocaleString()}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => toggleHide(r.post_id, r.is_hidden)}
                      disabled={actionLoading === r.post_id}
                    >
                      {r.is_hidden ? 'Ré-afficher' : 'Masquer'}
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => deletePost(r.post_id)}
                      disabled={actionLoading === r.post_id}
                      style={{ background: '#b91c1c' }}
                    >
                      Supprimer le post
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <button className="btn btn-secondary" onClick={fetchUsers} disabled={subLoading}>Rafraîchir</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#9ca3af', textAlign: 'left' }}>
                  <th style={{ padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>ID</th>
                  <th style={{ padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Pseudo</th>
                  <th style={{ padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Email</th>
                  <th style={{ padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Karma</th>
                  <th style={{ padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Dernière IP</th>
                  <th style={{ padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Etat</th>
                  <th style={{ padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '8px 6px' }}>{u.id}</td>
                    <td style={{ padding: '8px 6px', color: '#e5e5e5' }}>{u.username}</td>
                    <td style={{ padding: '8px 6px', color: '#e5e5e5' }}>{u.email}</td>
                    <td style={{ padding: '8px 6px' }}>{u.karma}</td>
                    <td style={{ padding: '8px 6px', fontFamily: 'monospace' }}>{u.last_ip || '—'}</td>
                    <td style={{ padding: '8px 6px', color: u.is_banned ? '#ef4444' : '#10b981' }}>{u.is_banned ? 'Banni' : 'Actif'}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => toggleUserBan(u.id, u.is_banned)}
                        disabled={actionLoading === `user-${u.id}`}
                      >{u.is_banned ? 'Débannir' : 'Bannir'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ip_bans' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <input
              placeholder="Adresse IP"
              value={newIp}
              onChange={e => setNewIp(e.target.value)}
              style={{ padding: 8, background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 4 }}
            />
            <input
              placeholder="Raison (optionnel)"
              value={newReason}
              onChange={e => setNewReason(e.target.value)}
              style={{ padding: 8, background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 4, minWidth: 220 }}
            />
            <button className="btn btn-primary" onClick={addIpBan} disabled={actionLoading === 'add-ip'}>Ajouter</button>
            <button className="btn btn-secondary" onClick={fetchIpBans} disabled={subLoading}>Rafraîchir</button>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {ipBans.length === 0 ? (
              <div style={{ color: '#9ca3af' }}>Aucun ban IP.</div>
            ) : ipBans.map(b => (
              <div key={b.ip} style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ fontFamily: 'monospace', color: '#e5e5e5' }}>{b.ip}</div>
                <div style={{ color: '#9ca3af', fontSize: 12, marginLeft: 'auto' }}>{b.reason || '—'} • {new Date(b.created_at).toLocaleString()}</div>
                <button className="btn btn-secondary" onClick={() => removeIpBan(b.ip)} disabled={actionLoading === `ip-${b.ip}`}>Retirer</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
