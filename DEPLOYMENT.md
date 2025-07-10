# 🚀 Quick Deployment Guide

## Option 1: GitHub Pages (Recommended)

### Step 1: Create Repository
1. Go to [GitHub](https://github.com) and create a new repository
2. Name it `Level-up` or any name you prefer
3. Make it **Public** (required for free GitHub Pages)

### Step 2: Upload Files
1. Upload all files from this folder to your repository:
   - `index.html`
   - `script-github.js`
   - `styles.css`
   - `manifest.json`
   - `README.md`
   - `.github/workflows/deploy.yml`

### Step 3: Enable GitHub Pages
1. Go to your repository Settings
2. Scroll down to "Pages" section
3. Under "Source", select "GitHub Actions"
4. The site will auto-deploy at: `https://your-username.github.io/Level-up/`

### Step 4: Share with Friends
- Give friends your GitHub Pages URL
- They can create/join rooms using room codes
- No setup required for users!

## Option 2: Other Platforms

### Netlify
1. Drag & drop this folder to [Netlify](https://netlify.com)
2. Get instant URL to share

### Vercel
1. Connect GitHub repository to [Vercel](https://vercel.com)
2. Auto-deploys on every commit

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase init hosting
firebase deploy
```

## 🎮 How Users Access It

1. **Visit your deployed URL**
2. **No installation needed** - runs in any browser
3. **Create/Join rooms** using 6-character codes
4. **Start competing** with friends instantly!

## 🔧 Advanced Features

### GitHub Sync Setup (Optional)
For users who want cross-device sync:

1. **User creates GitHub token**:
   - GitHub → Settings → Developer Settings → Personal Access Tokens
   - Generate token with "gist" permissions

2. **Enable in app**:
   - Click "🌐 GitHub Sync" button
   - Enter personal access token
   - Data automatically syncs across devices

### Room Sharing
- **Room codes**: 6 characters (e.g., "ABC123")
- **Share codes**: Send via text, email, or Discord
- **Multiple rooms**: Each room is independent competition

## 📱 Mobile Experience

- **Add to Home Screen**: Works like native app
- **Offline Support**: Continues working without internet
- **Responsive Design**: Perfect on phones and tablets

## 🎯 Ready to Deploy?

1. **Fork/Clone** this repository
2. **Follow Step 1-3** above for GitHub Pages
3. **Share your URL** with friends
4. **Start working out** and competing!

Your app will be live and ready for anyone to use! 🚀
