import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Comments from './Comments';

function Feed({ sortBy }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState(null); // last post id for 'new'
  const [offset, setOffset] = useState(0); // for hot/controversial
  const [openComments, setOpenComments] = useState({});
  const sentinelRef = useRef(null);

  useEffect(() => {
    // reset when sort changes
    setPosts([]);
    setHasMore(true);
    setCursor(null);
    setOffset(0);
    setLoading(true);
    fetchPosts(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  const fetchPosts = async (loadMore) => {
    if (!hasMore && loadMore) return;
    const token = localStorage.getItem('token');
    try {
      if (loadMore) setLoadingMore(true);
      const params = new URLSearchParams();
      params.set('sort', sortBy);
      params.set('limit', '20');
      if (sortBy === 'new') {
        if (cursor) params.set('cursor', String(cursor));
      } else {
        params.set('offset', String(offset));
      }
      const response = await axios.get(`http://localhost:5000/api/posts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data || [];
      setPosts(prev => loadMore ? [...prev, ...data] : data);
      // update pagination state
      if (sortBy === 'new') {
        if (data.length > 0) {
          setCursor(data[data.length - 1].id);
        }
      } else {
        setOffset(prev => prev + data.length);
      }
      setHasMore(data.length >= 20);
    } catch (error) {
      toast.error('Erreur lors du chargement des posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onIntersect = useCallback((entries) => {
    const first = entries[0];
    if (first.isIntersecting && !loading && !loadingMore) {
      fetchPosts(true);
    }
  }, [loading, loadingMore, sortBy, cursor, offset, hasMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(onIntersect, { threshold: 1.0 });
    const current = sentinelRef.current;
    if (current) observer.observe(current);
    return () => { if (current) observer.unobserve(current); };
  }, [onIntersect]);

  const handleVote = async (postId, voteType) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/posts/${postId}/vote`, 
        { vote_type: voteType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Optimistic refresh: re-fetch from start to reflect scores
      setCursor(null);
      setOffset(0);
      fetchPosts(false);
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error('Tu as déjà voté sur ce post');
      } else {
        toast.error('Erreur lors du vote');
      }
    }
  };

  const handleReport = async (postId) => {
    if (!window.confirm('Signaler ce post?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const reason = prompt('Raison du signalement:');
      if (!reason) return;
      
      await axios.post(`http://localhost:5000/api/posts/${postId}/report`, 
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Post signalé');
      fetchPosts();
    } catch (error) {
      toast.error('Erreur lors du signalement');
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'à l\'instant';
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
    return `il y a ${Math.floor(diff / 86400)} j`;
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ textAlign: 'center', padding: '50px' }}>
        <div className="spinner" style={{ color: '#dc2626' }}>Chargement...</div>
      </div>
    );
  }

  if (!loading && posts.length === 0) {
    return (
      <div className="empty-state" style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
        <h3>Aucune confession pour le moment</h3>
        <p>Sois le premier à partager un secret...</p>
      </div>
    );
  }

  return (
    <div className="feed">
      {posts.map(post => (
        <div key={post.id} className="post-card" style={{
          background: 'rgba(20, 20, 20, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '15px',
          backdropFilter: 'blur(10px)'
        }}>
          <div className="post-header" style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '15px',
            color: '#666',
            fontSize: '14px'
          }}>
            <span>Anonyme</span>
            <span>{formatTime(post.created_at)}</span>
          </div>
          <div className="sort-buttons">
            <button 
              className={`btn btn-secondary ${sortBy === 'recent' ? 'active' : ''}`}
              onClick={() => onSortChange('recent')}
            >
              Récents
            </button>
            <button 
              className={`btn btn-secondary ${sortBy === 'popular' ? 'active' : ''}`}
              onClick={() => onSortChange('popular')}
            >
              Populaires
            </button>
          </div>
          <div className="post-content" style={{ 
            color: '#e5e5e5',
            fontSize: '16px',
            lineHeight: '1.6',
            marginBottom: '20px'
          }}>
            {post.content}
          </div>
          
          <div className="post-actions" style={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: '20px'
          }}>
            <div className="vote-buttons" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => handleVote(post.id, 'up')}
                className="vote-btn"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#4ade80',
                  padding: '5px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(74, 222, 128, 0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                ▲ Vrai ({post.upvotes || 0})
              </button>
              
              <button
                onClick={() => handleVote(post.id, 'down')}
                className="vote-btn"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#f87171',
                  padding: '5px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(248, 113, 113, 0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                ▼ Faux ({post.downvotes || 0})
              </button>
            </div>
            
            <div className="score" style={{ 
              color: '#999',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              Score: {(post.upvotes || 0) - (post.downvotes || 0)}
            </div>
            <button
              onClick={() => setOpenComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
              className="comments-toggle"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#9ca3af',
                padding: '5px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              💬 Commentaires ({post.comment_count || 0})
            </button>
            
            <button
              onClick={() => handleReport(post.id)}
              className="report-btn"
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.color = '#dc2626'}
              onMouseLeave={(e) => e.target.style.color = '#666'}
            >
              ⚠️ Signaler
            </button>
          </div>
          {openComments[post.id] && (
            <div style={{ marginTop: '10px' }}>
              <Comments postId={post.id} />
            </div>
          )}
        </div>
      ))}
      <div ref={sentinelRef} style={{ height: '1px' }} />
      {loadingMore && (
        <div style={{ textAlign: 'center', padding: '10px', color: '#999' }}>Chargement...</div>
      )}
      {!hasMore && posts.length > 0 && (
        <div style={{ textAlign: 'center', padding: '10px', color: '#666' }}>Fin du fil</div>
      )}
    </div>
  );
}

export default Feed;
