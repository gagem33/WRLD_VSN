# 🚀 WRLD VSN - Deployment Guide
## From GitHub to Live Website + Mobile App

This guide shows you **3 easy ways** to deploy WRLD VSN so it's accessible on the web and installable as a phone app.

---

## 🎯 Quick Comparison

| Platform | Frontend | Backend | Database | Cost | Setup Time |
|----------|----------|---------|----------|------|------------|
| **Vercel + Railway** | ✅ | ✅ | ✅ | $0-5/mo | 10 min |
| **Render.com** | ✅ | ✅ | ✅ | $0-7/mo | 15 min |
| **AWS/GCP** | ✅ | ✅ | ✅ | $20-50/mo | 30 min |

**Recommended for beginners: Vercel + Railway** ⭐

---

## 🚀 Method 1: Vercel + Railway (EASIEST)

**Perfect for**: Quick deployment, free tier available
**Cost**: Free for hobby projects

### Step 1: Push to GitHub

```bash
cd wrld-vsn
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/wrld-vsn.git
git push -u origin main
```

### Step 2: Deploy Backend to Railway

1. **Sign up**: Go to https://railway.app (sign in with GitHub)
2. **New Project** → **Deploy from GitHub repo**
3. **Select** your `wrld-vsn` repository
4. **Add PostgreSQL** database (click "New" → "Database" → "PostgreSQL")
5. **Configure Backend**:
   - Service: Select `backend` folder
   - Add environment variables:
     ```
     MAPBOX_TOKEN=your_mapbox_token
     NEWSAPI_KEY=your_newsapi_key
     DATABASE_URL=${{Postgres.DATABASE_URL}}
     ```
6. **Deploy** - Railway will give you a URL like: `https://wrld-vsn-api.up.railway.app`

### Step 3: Deploy Frontend to Vercel

1. **Sign up**: Go to https://vercel.com (sign in with GitHub)
2. **Import Project** → Select your `wrld-vsn` repo
3. **Configure**:
   - Framework Preset: **Create React App**
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `build`
4. **Environment Variables**:
   ```
   REACT_APP_API_URL=https://wrld-vsn-api.up.railway.app
   REACT_APP_MAPBOX_TOKEN=your_mapbox_token
   ```
5. **Deploy** - Vercel gives you: `https://wrld-vsn.vercel.app`

### Step 4: Make it Installable as an App

The frontend is already configured as a **Progressive Web App (PWA)**!

**On Phone**:
1. Open `https://wrld-vsn.vercel.app` in browser
2. **iPhone**: Tap Share → "Add to Home Screen"
3. **Android**: Tap menu (⋮) → "Install app" or "Add to home screen"

Done! Now it works like a native app! 📱

---

## 🌟 Method 2: All-in-One Render.com

**Perfect for**: Single-platform deployment
**Cost**: Free tier available ($7/mo for better performance)

### Step 1: Push to GitHub (same as above)

### Step 2: Deploy to Render

1. **Sign up**: https://render.com (sign in with GitHub)
2. **New** → **Blueprint**
3. **Connect** your GitHub repo
4. **Select** `render.yaml` file (already configured!)
5. **Add Environment Variables**:
   ```
   MAPBOX_TOKEN=your_token
   NEWSAPI_KEY=your_key
   ```
6. **Apply** - Render deploys everything!

You'll get:
- Frontend: `https://wrld-vsn.onrender.com`
- Backend: `https://wrld-vsn-api.onrender.com`
- Database: PostgreSQL with PostGIS

### Make it a Phone App
Same as Method 1 - just visit your URL and "Add to Home Screen"

---

## 🔥 Method 3: GitHub Pages + Backend Separately

**Perfect for**: Free frontend hosting
**Cost**: $0 for frontend, $5/mo for backend

### Frontend on GitHub Pages (100% Free)

```bash
cd wrld-vsn/frontend

# Install gh-pages
npm install --save-dev gh-pages

# Add to package.json:
# "homepage": "https://YOUR-USERNAME.github.io/wrld-vsn"
# In scripts section add:
# "predeploy": "npm run build",
# "deploy": "gh-pages -d build"

# Deploy
npm run deploy
```

Visit: `https://YOUR-USERNAME.github.io/wrld-vsn`

### Backend Options:
- **Railway**: $5/mo (recommended)
- **Heroku**: $5/mo
- **DigitalOcean**: $4/mo

---

## 📱 Making it a REAL Mobile App

### Progressive Web App (PWA) - Already Built In! ✅

Your app already has:
- ✅ Service Worker (offline support)
- ✅ App manifest
- ✅ Mobile-responsive design
- ✅ Touch gestures
- ✅ Splash screen

**Users can install it like this:**

**iPhone/iPad:**
```
Safari → Share button → Add to Home Screen
```

**Android:**
```
Chrome → Menu (⋮) → Install app
```

### Want a Real App Store Listing?

If you want it in **Apple App Store** or **Google Play Store**:

#### Option A: Use Capacitor (Easier)
```bash
cd frontend
npm install @capacitor/core @capacitor/cli
npx cap init

# For iOS
npx cap add ios
npx cap open ios  # Opens Xcode

# For Android
npx cap add android
npx cap open android  # Opens Android Studio
```

#### Option B: Use React Native Web (More work)
Convert the frontend to React Native - allows shared codebase

---

## 🔧 Post-Deployment Setup

### 1. Enable HTTPS (Automatic on Vercel/Render/Railway)
Already done! ✅

### 2. Custom Domain (Optional)
```
1. Buy domain on Namecheap/GoDaddy ($10/year)
2. In Vercel/Render settings → Add custom domain
3. Update DNS records (they provide instructions)
4. Your app: https://wrldvsn.com
```

### 3. Add App Icons

Already configured! But you can customize:

```bash
# frontend/public/manifest.json
{
  "name": "WRLD VSN",
  "short_name": "WRLD VSN",
  "icons": [
    {
      "src": "icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#0a0a0a"
}
```

---

## 💰 Cost Breakdown

### Free Tier (Perfect for Testing)
- **Vercel**: Free (100GB bandwidth)
- **Railway**: Free ($5 credit/month)
- **GitHub**: Free hosting
- **Total: $0/month** ⭐

### Hobby Tier (Recommended)
- **Vercel**: Free
- **Railway**: $5/month
- **Domain**: $10/year ($0.83/month)
- **Total: ~$6/month**

### Production (High Traffic)
- **Vercel Pro**: $20/month
- **Railway**: $20/month
- **Database**: $15/month
- **CDN**: $10/month
- **Total: ~$65/month**

---

## 🎯 Complete Deployment Checklist

### Before Deployment
- [ ] Push code to GitHub
- [ ] Get Mapbox token
- [ ] Get NewsAPI key (optional)
- [ ] Test locally with `./start.sh`

### Deploy Backend
- [ ] Create Railway/Render account
- [ ] Add PostgreSQL database
- [ ] Configure environment variables
- [ ] Deploy backend service
- [ ] Test API at `/docs` endpoint

### Deploy Frontend
- [ ] Create Vercel account
- [ ] Connect GitHub repo
- [ ] Set API URL in environment
- [ ] Deploy frontend
- [ ] Test on desktop browser

### Mobile Setup
- [ ] Test on mobile browser
- [ ] Add to home screen
- [ ] Test app functionality
- [ ] Test offline mode

### Optional Enhancements
- [ ] Set up custom domain
- [ ] Configure analytics (Google Analytics)
- [ ] Set up error monitoring (Sentry)
- [ ] Enable auto-deploy on push

---

## 🔍 Testing Your Deployed App

### Check Backend
```bash
# Should return API info
curl https://your-api.railway.app/

# Should return sentiment data
curl https://your-api.railway.app/api/v1/sentiment/global
```

### Check Frontend
1. Visit your Vercel URL
2. Map should load
3. Click a location
4. Check browser console for errors

### Check Mobile
1. Open on phone browser
2. Add to home screen
3. Open installed app
4. Test map interactions

---

## 🐛 Common Issues & Fixes

### "API is not responding"
- ✅ Check Railway/Render backend is running
- ✅ Verify API URL in frontend env vars
- ✅ Check CORS settings in backend

### "Map not loading"
- ✅ Verify Mapbox token is set
- ✅ Check browser console for errors
- ✅ Ensure token is for the correct domain

### "Can't add to home screen"
- ✅ Site must be HTTPS (automatic on Vercel/Render)
- ✅ Check manifest.json exists
- ✅ Try different browser (Safari for iOS, Chrome for Android)

### "Slow performance"
- ✅ Upgrade to paid tier on Railway ($5/mo)
- ✅ Enable caching in Vercel
- ✅ Reduce data fetch frequency

---

## 📈 Monitoring Your App

### Vercel Analytics (Built-in)
- Pageviews
- User locations
- Performance metrics
- Free for hobby projects

### Railway Metrics
- CPU usage
- Memory
- Network traffic
- Database size

### Add Google Analytics
```html
<!-- In frontend/public/index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

---

## 🚀 Auto-Deploy on Git Push

Both Vercel and Railway support automatic deployments:

1. **Push to GitHub main branch**
2. **Automatic deployment triggered**
3. **Live in ~2 minutes**

```bash
git add .
git commit -m "Update feature"
git push origin main
# ✅ Auto-deploys to production!
```

---

## 🎓 Next Steps After Deployment

1. **Share with friends**: Send them the URL
2. **Get feedback**: What features do they want?
3. **Monitor usage**: Check Vercel/Railway dashboards
4. **Iterate**: Add new data sources, improve UI
5. **Scale**: Upgrade plans as traffic grows

---

## 📞 Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **Render Docs**: https://render.com/docs
- **GitHub Issues**: Create an issue in your repo

---

## ✨ Success Stories

After deployment, you'll have:
- ✅ Live website accessible worldwide
- ✅ Installable mobile app (PWA)
- ✅ Auto-scaling infrastructure
- ✅ HTTPS security
- ✅ CDN for fast loading
- ✅ Professional deployment pipeline

**You built a Bloomberg Terminal competitor and deployed it globally! 🎉**

---

**Estimated Time**: 30 minutes from zero to deployed app!
