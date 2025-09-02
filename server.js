const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const Filter = require('bad-words');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:8080", "http://localhost:5000"],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'haberge_confessions_secret_2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));
app.set('trust proxy', true);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

const postLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10 // limit each IP to 10 posts per hour
});

app.use('/api/', limiter);
app.use('/api/posts', postLimiter);

// Initialize filter for bad words
const filter = new Filter();
filter.addWords('harcèlement', 'suicide', 'drogue');

// Database setup
const db = new sqlite3.Database('./haberge_confessions.db');

// Create tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    karma INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Posts table
  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    content TEXT NOT NULL,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    is_hidden BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
  
  // Reports table
  db.run(`CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    post_id INTEGER NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (post_id) REFERENCES posts (id)
  )`);
  
  // Votes table
  db.run(`CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    post_id INTEGER,
    vote_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (post_id) REFERENCES posts (id),
    UNIQUE(user_id, post_id)
  )`);

  // Comments table
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
  
  // Attempt to add moderation/badges columns if missing (ignore errors if already exist)
  db.run("ALTER TABLE users ADD COLUMN badges TEXT DEFAULT '[]'", () => {});
  db.run("ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT 0", () => {});
  db.run("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0", () => {});

  // IP bans table
  db.run(`CREATE TABLE IF NOT EXISTS ip_bans (
    ip TEXT PRIMARY KEY,
    reason TEXT,
    banned_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // User IP log table
  db.run(`CREATE TABLE IF NOT EXISTS user_ips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    ip TEXT,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Helpers
const getClientIp = (req) => {
  const xf = req.headers['x-forwarded-for'];
  if (xf) return xf.split(',')[0].trim();
  return (req.ip || req.connection?.remoteAddress || '').replace('::ffff:', '');
};

const logUserIp = (userId, ip) => {
  if (!userId || !ip) return;
  db.run(
    `INSERT INTO user_ips (user_id, ip, last_seen) VALUES (?, ?, CURRENT_TIMESTAMP)`,
    [userId, ip]
  );
};

// Ensure admin account exists; fall back to default credentials if not provided via env
const ensureAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Sacha70***';

  db.get('SELECT id FROM users WHERE username = ?', ['admin'], async (err, row) => {
    if (err) return;
    if (!row) {
      try {
        const hashed = await bcrypt.hash(adminPassword, 10);
        db.run(
          "INSERT INTO users (email, username, password, karma, badges, is_admin) VALUES (?, ?, ?, 0, '[]', 1)",
          [adminEmail, 'admin', hashed]
        );
        console.log('Admin user created');
      } catch (e) {}
    }
  });
};
ensureAdmin();

// Global middleware: block banned IPs
app.use((req, res, next) => {
  const ip = getClientIp(req);
  if (!ip) return next();
  db.get('SELECT ip FROM ip_bans WHERE ip = ?', [ip], (err, row) => {
    if (row) return res.status(403).json({ error: 'IP bannie' });
    next();
  });
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requis' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

const ensureNotBanned = (req, res, next) => {
  db.get('SELECT is_banned FROM users WHERE id = ?', [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Erreur serveur' });
    if (row && row.is_banned) return res.status(403).json({ error: 'Compte banni' });
    next();
  });
};

// Content moderation function
const filterContent = (content) => {
  if (filter.isProfane(content)) {
    return { blocked: true, reason: 'Contenu inapproprié détecté' };
  }
  
  // Check for personal information patterns
  const personalInfoPatterns = [
    /\b\d{10}\b/, // Phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b\d{1,3}\s+[A-Za-z\s]+\b/ // Addresses
  ];
  
  for (let pattern of personalInfoPatterns) {
    if (pattern.test(content)) {
      return { blocked: true, reason: 'Informations personnelles détectées' };
    }
  }
  
  return { blocked: false, content };
};

// Generate a random anonymous username
const generateUsername = (cb) => {
  const adjectives = ['Sombre', 'Mystique', 'Ombre', 'Nocturne', 'Secret', 'Rouge', 'Silencieux', 'Occulte'];
  const nouns = ['Corbeau', 'Spectre', 'Loup', 'Phantom', 'Serpent', 'Obscur', 'Eclipse', 'Chuchotement'];
  const pick = () => `${adjectives[Math.floor(Math.random()*adjectives.length)]}${nouns[Math.floor(Math.random()*nouns.length)]}${Math.floor(100+Math.random()*900)}`;
  const tryName = () => {
    const uname = pick();
    db.get('SELECT id FROM users WHERE username = ?', [uname], (err, row) => {
      if (row) return tryName();
      cb(uname);
    });
  };
  tryName();
};

// API Routes

// Register
app.post('/api/register', async (req, res) => {
  let { email, username, password } = req.body;
  
  // Accept all emails
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email valide requis' });
  }

  try {
    const proceed = async (finalUsername) => {
      if (!finalUsername || finalUsername.length < 3 || finalUsername.length > 20) {
        return res.status(400).json({ error: 'Le pseudo doit faire entre 3 et 20 caractères' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      db.run(
        'INSERT INTO users (email, username, password, badges) VALUES (?, ?, ?, ?)',
        [email, finalUsername, hashedPassword, '[]'],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE')) {
              return res.status(400).json({ error: 'Email ou pseudo déjà utilisé' });
            }
            return res.status(500).json({ error: 'Erreur serveur' });
          }

          const token = jwt.sign(
            { id: this.lastID, username: finalUsername, email },
            JWT_SECRET,
            { expiresIn: '7d' }
          );

          // log IP for this new user
          try { logUserIp(this.lastID, getClientIp(req)); } catch {}

          res.json({ token, username: finalUsername, userId: this.lastID, karma: 0 });
        }
      );
    };

    if (!username || username.toLowerCase() === 'random') {
      generateUsername(proceed);
    } else {
      proceed(username);
    }
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  db.get(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // log IP on login
      try { logUserIp(user.id, getClientIp(req)); } catch {}

      res.json({ 
        token, 
        username: user.username, 
        userId: user.id,
        karma: user.karma
      });
    }
  );
});

// Admin middleware
const requireAdmin = (req, res, next) => {
  db.get('SELECT is_admin FROM users WHERE id = ?', [req.user.id], (err, row) => {
    if (err || !row || !row.is_admin) return res.status(403).json({ error: 'Accès refusé' });
    next();
  });
};

// Admin: list reports
app.get('/api/admin/reports', authenticateToken, requireAdmin, (req, res) => {
  db.all(
    `SELECT r.id, r.post_id, r.reason, r.created_at, p.content, p.is_hidden
     FROM reports r JOIN posts p ON p.id = r.post_id
     ORDER BY r.created_at DESC LIMIT 200`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erreur serveur' });
      res.json(rows);
    }
  );
});

// Admin: hide/unhide post
app.post('/api/admin/posts/:id/hide', authenticateToken, requireAdmin, (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const { hide = 1 } = req.body;
  db.run('UPDATE posts SET is_hidden = ? WHERE id = ?', [hide ? 1 : 0, postId], function (err) {
    if (err) return res.status(500).json({ error: 'Erreur serveur' });
    res.json({ updated: this.changes });
  });
});

// Admin: delete post
app.delete('/api/admin/posts/:id', authenticateToken, requireAdmin, (req, res) => {
  const postId = parseInt(req.params.id, 10);
  db.run('DELETE FROM comments WHERE post_id = ?', [postId], () => {
    db.run('DELETE FROM reports WHERE post_id = ?', [postId], () => {
      db.run('DELETE FROM votes WHERE post_id = ?', [postId], () => {
        db.run('DELETE FROM posts WHERE id = ?', [postId], function (err) {
          if (err) return res.status(500).json({ error: 'Erreur serveur' });
          res.json({ deleted: this.changes });
        });
      });
    });
  });
});

// Admin: delete comment
app.delete('/api/admin/comments/:id', authenticateToken, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.run('DELETE FROM comments WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Erreur serveur' });
    res.json({ deleted: this.changes });
  });
});

// Post
app.post('/api/posts', authenticateToken, ensureNotBanned, postLimiter, (req, res) => {
  const { content } = req.body;
  const userId = req.user.id;
  
  // Filter content
  const filtered = filterContent(content);
  if (filtered.blocked) {
    return res.status(400).json({ error: filtered.reason });
  }
  
  db.run(
    'INSERT INTO posts (user_id, content) VALUES (?, ?)',
    [userId, filtered.content],
    function(err) {
      if (err) return res.status(500).json({ error: 'Erreur serveur' });
      
      // Add karma
      db.run('UPDATE users SET karma = karma + 5 WHERE id = ?', [userId]);
      // Log IP
      try { logUserIp(userId, getClientIp(req)); } catch {}
      
      // Notify via socket
      io.emit('new-post', { id: this.lastID });
      
      res.json({ id: this.lastID, message: 'Post publié!' });
    }
  );
});

// Get posts
app.get('/api/posts', authenticateToken, (req, res) => {
  const { sort = 'new', cursor, limit = 20, offset = 0 } = req.query;
  const lim = Math.min(parseInt(limit, 10) || 20, 50);

  let orderBy = 'p.created_at DESC';
  if (sort === 'hot') {
    orderBy = '(p.upvotes - p.downvotes) DESC, p.created_at DESC';
  } else if (sort === 'controversial') {
    orderBy = 'ABS(p.upvotes - p.downvotes) ASC, (p.upvotes + p.downvotes) DESC';
  }

  let where = 'p.is_hidden = 0';
  const params = [req.user.id];
  if (cursor && sort === 'new') {
    where += ' AND p.id < ?';
    params.push(parseInt(cursor, 10));
  }

  const pagination = sort === 'new' ? '' : ` OFFSET ${parseInt(offset, 10) || 0}`;

  db.all(
    `SELECT p.*, 
            (SELECT vote_type FROM votes WHERE user_id = ? AND post_id = p.id) as user_vote,
            (SELECT COUNT(1) FROM comments c WHERE c.post_id = p.id) as comment_count
     FROM posts p 
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT ${lim}${pagination}`,
    params,
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erreur serveur' });
      res.json(rows);
    }
  );
});

// Comments: add & list
app.post('/api/posts/:id/comments', authenticateToken, ensureNotBanned, (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const { content } = req.body;
  const userId = req.user.id;

  const filtered = filterContent(content || '');
  if (filtered.blocked) {
    return res.status(400).json({ error: filtered.reason });
  }

  db.get('SELECT id FROM posts WHERE id = ? AND is_hidden = 0', [postId], (err, post) => {
    if (err || !post) return res.status(404).json({ error: 'Post introuvable' });
    db.run(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [postId, userId, filtered.content],
      function (e) {
        if (e) return res.status(500).json({ error: 'Erreur serveur' });
        res.json({ id: this.lastID, message: 'Commentaire ajouté' });
      }
    );
  });
});

app.get('/api/posts/:id/comments', authenticateToken, (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const { cursor, limit = 20 } = req.query;
  const lim = Math.min(parseInt(limit, 10) || 20, 50);
  const params = [postId];
  let where = 'post_id = ?';
  if (cursor) { where += ' AND id < ?'; params.push(parseInt(cursor, 10)); }
  db.all(
    `SELECT id, content, created_at FROM comments WHERE ${where} ORDER BY id DESC LIMIT ${lim}`,
    params,
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erreur serveur' });
      res.json(rows);
    }
  );
});

// Vote on post
app.post('/api/posts/:id/vote', authenticateToken, ensureNotBanned, (req, res) => {
  const { vote_type } = req.body; // 'up' or 'down'
  const postId = req.params.id;
  const userId = req.user.id;
  
  if (!['up', 'down'].includes(vote_type)) {
    return res.status(400).json({ error: 'Type de vote invalide' });
  }
  
  // Check if user already voted
  db.get(
    'SELECT * FROM votes WHERE user_id = ? AND post_id = ?',
    [userId, postId],
    (err, existingVote) => {
      if (err) return res.status(500).json({ error: 'Erreur serveur' });
      
      if (existingVote) {
        if (existingVote.vote_type === vote_type) {
          // Cancel vote
          db.run('DELETE FROM votes WHERE user_id = ? AND post_id = ?', [userId, postId]);
          
          const column = vote_type === 'up' ? 'upvotes' : 'downvotes';
          db.run(`UPDATE posts SET ${column} = ${column} - 1 WHERE id = ?`, [postId]);
          
          return res.json({ message: 'Vote annulé', vote: null });
        } else {
          // Change vote
          db.run('UPDATE votes SET vote_type = ? WHERE user_id = ? AND post_id = ?', [vote_type, userId, postId]);
          
          if (vote_type === 'up') {
            db.run('UPDATE posts SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE id = ?', [postId]);
          } else {
            db.run('UPDATE posts SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = ?', [postId]);
          }
          
          return res.json({ message: 'Vote modifié', vote: vote_type });
        }
      } else {
        // New vote
        db.run(
          'INSERT INTO votes (user_id, post_id, vote_type) VALUES (?, ?, ?)',
          [userId, postId, vote_type],
          (err) => {
            if (err) return res.status(500).json({ error: 'Erreur serveur' });
            
            const column = vote_type === 'up' ? 'upvotes' : 'downvotes';
            db.run(`UPDATE posts SET ${column} = ${column} + 1 WHERE id = ?`, [postId]);
            
            res.json({ message: 'Vote enregistré', vote: vote_type });
          }
        );
      }
    }
  );
});

// Report content (new route)
app.post('/api/posts/:id/report', authenticateToken, ensureNotBanned, (req, res) => {
  const post_id = parseInt(req.params.id, 10);
  const { reason } = req.body;
  const userId = req.user.id;
  
  // Check if already reported by this user
  db.get(
    'SELECT * FROM reports WHERE user_id = ? AND post_id = ?',
    [userId, post_id],
    (err, existing) => {
      if (existing) {
        return res.status(400).json({ error: 'Déjà signalé' });
      }
      db.run(
        'INSERT INTO reports (user_id, post_id, reason) VALUES (?, ?, ?)',
        [userId, post_id, reason || null],
        function (e) {
          if (e) return res.status(500).json({ error: 'Erreur serveur' });
          db.get('SELECT COUNT(*) as count FROM reports WHERE post_id = ?', [post_id], (e2, r) => {
            if (r && r.count >= 3) {
              db.run('UPDATE posts SET is_hidden = 1 WHERE id = ?', [post_id]);
            }
            res.json({ message: 'Signalement enregistré' });
          });
        }
      );
    }
  );
});

// Legacy report route kept for compatibility
app.post('/api/report', authenticateToken, ensureNotBanned, (req, res) => {
  const { post_id, reason } = req.body;
  const userId = req.user.id;
  
  // Check if already reported by this user
  db.get(
    'SELECT * FROM reports WHERE user_id = ? AND post_id = ?',
    [userId, post_id],
    (err, existing) => {
      if (existing) {
        return res.status(400).json({ error: 'Déjà signalé' });
      }
      
      // Create report
      db.run(
        'INSERT INTO reports (user_id, post_id, reason) VALUES (?, ?, ?)',
        [userId, post_id, reason],
        function(err) {
          if (err) return res.status(500).json({ error: 'Erreur serveur' });
          
          // Count reports
          db.get(
            'SELECT COUNT(*) as count FROM reports WHERE post_id = ?',
            [post_id],
            (err, result) => {
              if (result && result.count >= 3) {
                // Hide content after 3 reports
                db.run('UPDATE posts SET is_hidden = 1 WHERE id = ?', [post_id]);
              }
              
              res.json({ message: 'Signalement enregistré' });
            }
          );
        }
      );
    }
  );
});

// Get user profile
app.get('/api/profile', authenticateToken, (req, res) => {
  db.get(
    'SELECT id, username, email, karma, created_at, badges FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }
      try {
        user.badges = user.badges ? JSON.parse(user.badges) : [];
      } catch { user.badges = []; }
      res.json(user);
    }
  );
});

// Get leaderboard (karma)
app.get('/api/leaderboard', authenticateToken, (req, res) => {
  db.all(
    'SELECT username, karma, badges FROM users WHERE (is_banned IS NULL OR is_banned = 0) ORDER BY karma DESC LIMIT 20',
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      rows.forEach(row => {
        try { row.badges = row.badges ? JSON.parse(row.badges) : []; } catch { row.badges = []; }
      });
      res.json(rows);
    }
  );
});

// Socket.io for real-time features
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Admin: list users
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  db.all(
    `SELECT u.id, u.username, u.email, u.karma, u.created_at, u.is_banned,
            (SELECT ip FROM user_ips WHERE user_id = u.id ORDER BY last_seen DESC LIMIT 1) as last_ip
     FROM users u
     ORDER BY u.created_at DESC
     LIMIT 500`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erreur serveur' });
      res.json(rows || []);
    }
  );
});

// Admin: ban/unban user account
app.post('/api/admin/users/:id/ban', authenticateToken, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { ban } = req.body; // 1 or 0
  if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' });
  db.run('UPDATE users SET is_banned = ? WHERE id = ?', [ban ? 1 : 0, id], function (err) {
    if (err) return res.status(500).json({ error: 'Erreur serveur' });
    res.json({ updated: this.changes });
  });
});

// Admin: list IP bans
app.get('/api/admin/ip-bans', authenticateToken, requireAdmin, (req, res) => {
  db.all('SELECT ip, reason, banned_by, created_at FROM ip_bans ORDER BY created_at DESC LIMIT 500', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erreur serveur' });
    res.json(rows || []);
  });
});

// Admin: add IP ban
app.post('/api/admin/ip-bans', authenticateToken, requireAdmin, (req, res) => {
  const { ip, reason } = req.body;
  if (!ip || typeof ip !== 'string') return res.status(400).json({ error: 'IP invalide' });
  db.run(
    'INSERT OR REPLACE INTO ip_bans (ip, reason, banned_by) VALUES (?, ?, ?)',
    [ip.trim(), reason || null, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Erreur serveur' });
      res.json({ banned: ip.trim() });
    }
  );
});

// Admin: remove IP ban
app.delete('/api/admin/ip-bans/:ip', authenticateToken, requireAdmin, (req, res) => {
  const ip = req.params.ip;
  db.run('DELETE FROM ip_bans WHERE ip = ?', [ip], function (err) {
    if (err) return res.status(500).json({ error: 'Erreur serveur' });
    res.json({ deleted: this.changes });
  });
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
