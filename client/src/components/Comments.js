import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

function formatTime(ts) {
  const d = new Date(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'il y a quelques secondes';
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `il y a ${mins} min${mins > 1 ? 's' : ''}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

const Comments = ({ postId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // reset when post changes
    setComments([]);
    setHasMore(true);
    setCursor(null);
    setLoading(true);
    fetchComments(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const fetchComments = async (loadMore) => {
    if (!hasMore && loadMore) return;
    const token = localStorage.getItem('token');
    try {
      if (loadMore) setLoadingMore(true);
      const params = new URLSearchParams();
      params.set('limit', '20');
      if (cursor) params.set('cursor', String(cursor));
      const res = await axios.get(`http://localhost:5000/api/posts/${postId}/comments?${params.toString()}` , {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data || [];
      setComments(prev => loadMore ? [...prev, ...data] : data);
      if (data.length > 0) setCursor(data[data.length - 1].id);
      setHasMore(data.length >= 20);
    } catch (e) {
      toast.error("Erreur lors du chargement des commentaires");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    const token = localStorage.getItem('token');
    try {
      setSubmitting(true);
      await axios.post(`http://localhost:5000/api/posts/${postId}/comments`, { content }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContent('');
      // refresh from start
      setCursor(null);
      fetchComments(false);
      toast.success('Commentaire ajouté');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'ajout');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="comments" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 12 }}>
      <form onSubmit={submitComment} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Écrire un commentaire..."
          disabled={submitting}
          style={{ flex: 1, background: 'rgba(0,0,0,0.5)', color: '#e5e5e5', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 10px', borderRadius: 6 }}
        />
        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '8px 12px' }}>
          Publier
        </button>
      </form>

      {loading && (
        <div style={{ color: '#9ca3af', fontSize: 14 }}>Chargement...</div>
      )}

      {!loading && comments.length === 0 && (
        <div style={{ color: '#9ca3af', fontSize: 14 }}>Aucun commentaire encore. Sois le premier !</div>
      )}

      {comments.map((c) => (
        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ color: '#e5e5e5' }}>{c.content}</div>
          <div style={{ color: '#9ca3af', fontSize: 12 }}>{formatTime(c.created_at)}</div>
        </div>
      ))}

      {hasMore && comments.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <button className="btn btn-secondary" onClick={() => fetchComments(true)} disabled={loadingMore}>
            {loadingMore ? 'Chargement...' : 'Charger plus'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Comments;
