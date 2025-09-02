# haberge confest (H.C)

Une plateforme de confessions anonymes pour partager des secrets dans l'ombre.

## 🌑 Description

haberge confest est une plateforme mystérieuse où les utilisateurs peuvent partager leurs confessions les plus sombres de manière totalement anonyme. Un système de vote permet à la communauté de juger si les confessions sont vraies ou fausses.

## ⚡ Fonctionnalités

- **Feed unique style Reddit** : Toutes les confessions dans un seul flux
- **Système de vote Vrai/Faux** : Votez sur la véracité des confessions
- **Anonymat total** : Aucune trace, aucun nom
- **Tri dynamique** : Nouveau, Hot, Controversé
- **Thème sombre** : Interface mystérieuse et secrète
- **Inscription ouverte** : Accepte tous les emails

## 🚀 Installation

### Backend
```bash
npm install
npm start
```

### Frontend
```bash
cd client
npm install
npm start
```

L'application sera accessible sur http://localhost:3000

## 💀 Utilisation

1. Inscrivez-vous avec n'importe quel email
2. Créez votre profil anonyme
3. Partagez vos confessions
4. Votez sur la véracité des autres confessions
5. Gagnez du karma selon vos contributions

## 🔥 Système de Vote

- **Upvote (Vrai)** : Si vous pensez que la confession est vraie
- **Downvote (Faux)** : Si vous pensez que c'est inventé
- **Score** : Différence entre les votes vrais et faux
- **Tri Hot** : Posts avec le plus d'activité récente
- **Tri Controversé** : Posts avec votes équilibrés

## 🛠️ Technologies

- **Backend** : Node.js, Express, SQLite
- **Frontend** : React, Axios
- **Auth** : JWT
- **Temps réel** : Socket.io
- **Sécurité** : Bcrypt, rate limiting

## ⚠️ Modération

- Filtrage automatique du contenu inapproprié
- Système de signalement
- Auto-masquage après 3 signalements
- Protection contre le spam avec rate limiting

## 🔧 Configuration

Créer un fichier `.env` à la racine:
```env
JWT_SECRET=your_super_secret_key_here
PORT=5000
NODE_ENV=development
```

## 🎮 Lancement

```bash
# Terminal 1 - Backend
npm start

# Terminal 2 - Frontend
cd client
npm start
```

L'app sera accessible sur:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## 📱 Utilisation

1. **Inscription** avec n'importe quel email valide
2. **Choisis un pseudo** anonyme (3-20 caractères)
3. **Explore** les différentes sections
4. **Poste** du contenu avec le bouton "+"
5. **Gagne du karma** en étant positif

## 🛡️ Règles

- ✅ Bienveillance et respect
- ✅ Anonymat protégé
- ✅ Contenu positif encouragé
- ❌ Harcèlement = ban immédiat
- ❌ Doxxing interdit
- ❌ Contenu inapproprié filtré

## 🏗️ Architecture

```
haberge-confessions/
├── server.js              # Backend Express
├── haberge_confessions.db # Base SQLite
├── client/
│   ├── src/
│   │   ├── components/    # Composants React
│   │   ├── context/       # Context API
│   │   └── App.js         # App principale
│   └── public/
└── README.md
```

## 🎯 Roadmap

- [ ] Notifications push
- [ ] Messages privés anonymes
- [ ] Sondages anonymes
- [ ] Events du lycée
- [ ] Mode sombre
- [ ] App mobile

## 📊 KPIs

- Inscriptions J1/J7
- Taux de match crush
- Ratio compliments/signalements
- Rétention D1/D7/D30
- Karma moyen par user

## 🚨 Support

En cas de problème:
1. Signaler le contenu inapproprié
2. Contacter les modérateurs
3. Email: admin@haberge-confessions.local

## 📜 License

MIT - Utilisation libre pour établissements scolaires

---

**Fait avec 💜**
