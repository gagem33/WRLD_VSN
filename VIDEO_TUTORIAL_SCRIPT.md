# 📹 WRLD VSN - Video Tutorial Script
## "Deploy Your Financial Intelligence Platform in 10 Minutes"

---

## 🎬 Video 1: GitHub to Website (10 minutes)

### INTRO (0:00-0:30)
**[Show finished app running on phone and desktop]**

"Hey everyone! Today I'm going to show you how to deploy WRLD VSN - a Bloomberg Terminal-style app that shows global financial sentiment on a map - and make it installable on your phone. And the best part? It's completely free."

**[Show GitHub repo]**

"I've already built the entire platform for you. You just need to click a few buttons."

---

### PART 1: Get the Code (0:30-2:00)

**[Screen: GitHub.com]**

"Step 1: Go to GitHub and create a new repository called 'wrld-vsn'"

**[Click through creating repo]**

"Now download the project files I've prepared..."

**[Show terminal]**

```bash
# Extract the files
tar -xzf wrld-vsn.tar.gz
cd wrld-vsn

# Push to GitHub
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR-REPO-URL
git push -u origin main
```

"And we're live on GitHub!"

---

### PART 2: Get API Keys (2:00-4:00)

**[Screen: Mapbox.com]**

"Before we deploy, we need one free API key. Go to mapbox.com and sign up."

**[Walk through signup]**

"Click 'Create a token'... copy this... and save it somewhere."

**[Show notepad with token]**

"That's it! This is the only required key. The news data works without any keys in demo mode."

---

### PART 3: Deploy Backend (4:00-6:30)

**[Screen: Railway.app]**

"Now let's deploy the backend. Go to railway.app and sign in with GitHub."

**[Click through]**

1. "Click 'New Project'"
2. "Deploy from GitHub repo"
3. "Select wrld-vsn"
4. "Add a PostgreSQL database" **[Click Add → Database → PostgreSQL]**
5. "Now configure the backend service"
   - **[Show settings panel]**
   - "Add these environment variables:"
     ```
     MAPBOX_TOKEN = [paste your token]
     DATABASE_URL = ${{Postgres.DATABASE_URL}}
     ```
6. "Click Deploy"

**[Watch it build]**

"Railway is building everything... this takes about 2 minutes..."

**[Build completes]**

"Perfect! Copy this URL - that's your API."

---

### PART 4: Deploy Frontend (6:30-8:30)

**[Screen: Vercel.com]**

"Now the frontend. Go to vercel.com and sign in with GitHub."

**[Click through]**

1. "Import Project"
2. "Select wrld-vsn"
3. "Configure:"
   - Root Directory: `frontend`
   - Framework: Create React App
4. "Environment Variables:"
   ```
   REACT_APP_API_URL = [paste Railway URL]
   REACT_APP_MAPBOX_TOKEN = [paste Mapbox token]
   ```
5. "Deploy"

**[Watch it deploy]**

"Vercel is deploying... usually takes 1-2 minutes..."

**[Deployment success]**

"Done! Here's your live website URL!"

---

### PART 5: Install as Phone App (8:30-10:00)

**[Switch to phone screen recording]**

**iPhone:**
"Open Safari and go to your Vercel URL..."

**[Show the app loading]**

"Look at that! The map is loading, sentiment data is showing..."

"Now tap the Share button... scroll down... 'Add to Home Screen'... tap Add."

**[Show app icon appearing on home screen]**

"Now it's a real app! Let me open it..."

**[Tap app icon, show it opening full screen]**

"It opens full screen, no browser chrome, just like a native app!"

**Android:**
**[Same process but with Android]**

"On Android, tap the three dots menu, then 'Install app'..."

**[Show installation]**

"And there it is!"

---

### OUTRO (10:00-10:30)

**[Show both phone and desktop running]**

"And that's it! You now have a professional financial intelligence platform running on the web and installable on any phone. For free."

**[Show map with real data]**

"The sentiment heatmap updates in real-time, news markers show breaking events, and you can click anywhere to see local data."

"Drop a comment if you want me to show how to add Twitter data, custom alerts, or deploy this to your own domain."

"Code is in the description. Thanks for watching!"

---

## 🎬 Video 2: Add Features (15 minutes)

### Topics:
1. Connect Twitter API
2. Add custom watchlists
3. Set up email alerts
4. Custom domain setup
5. Analytics tracking

---

## 🎬 Video 3: Advanced Deployment (20 minutes)

### Topics:
1. AWS deployment
2. Kubernetes scaling
3. Load balancing
4. Database optimization
5. CDN setup

---

## 📝 YouTube Description Template

```
🌍 Deploy a Bloomberg Terminal-Style Financial Intelligence Platform

In this tutorial, I show you how to deploy WRLD VSN - a real-time geospatial financial market platform - from GitHub to a live website that works as a mobile app.

⏱️ Timestamps:
0:00 - Intro & Demo
0:30 - Get the Code from GitHub
2:00 - Get Free Mapbox API Key
4:00 - Deploy Backend to Railway
6:30 - Deploy Frontend to Vercel
8:30 - Install as Phone App
10:00 - Outro

🔗 Links:
- Code: [Your GitHub URL]
- Railway: https://railway.app
- Vercel: https://vercel.com
- Mapbox: https://mapbox.com

💰 Cost: FREE (using free tiers)

📱 What You Get:
✅ Live website
✅ Installable phone app (PWA)
✅ Real-time sentiment heatmap
✅ Breaking news alerts
✅ Market data visualization

🛠️ Tech Stack:
- Frontend: React + Mapbox + Deck.gl
- Backend: Python + FastAPI
- Database: PostgreSQL + PostGIS
- AI: FinBERT sentiment analysis

⚡ Features:
- Real-time global sentiment tracking
- Geospatial news visualization
- AI-powered analysis
- Mobile-first design
- Progressive Web App (PWA)

🎓 Perfect for:
- Learning full-stack development
- Portfolio projects
- Startup MVPs
- Finance enthusiasts

💻 Prerequisites:
- GitHub account (free)
- Basic terminal knowledge
- That's it!

#webdevelopment #reactjs #python #fintech #tutorial
```

---

## 📱 Social Media Posts

### Twitter/X:
```
Just deployed a Bloomberg Terminal competitor in 10 minutes 🚀

✅ Real-time global sentiment
✅ AI-powered analysis
✅ Works as phone app
✅ Completely FREE

Watch: [YouTube link]
Code: [GitHub link]

#webdev #fintech #opensource
```

### LinkedIn:
```
I built and deployed a geospatial financial intelligence platform this weekend.

The stack:
→ React + Mapbox for visualization
→ Python + FastAPI backend
→ PostgreSQL + PostGIS for geo-queries
→ FinBERT for sentiment analysis

Deployed for free using:
→ Vercel (frontend)
→ Railway (backend)
→ Works as a Progressive Web App

Full tutorial: [link]

This is what you can build with modern free-tier cloud services.

#FullStack #FinTech #DataVisualization
```

---

## 🎥 TikTok/YouTube Shorts Script (60 seconds)

**[0-5s]** "I built a Bloomberg Terminal in a weekend"

**[5-10s]** [Show map with sentiment data]

**[10-15s]** "Real-time global financial sentiment"

**[15-20s]** "Breaking news with geo-location"

**[20-25s]** "AI-powered analysis"

**[25-35s]** "Deployed to web for FREE" [Show Railway + Vercel logos]

**[35-45s]** "Works as a phone app" [Show installing on phone]

**[45-50s]** "Open source, full tutorial in bio"

**[50-60s]** [Show final result with URL]

---

## 📊 Metrics to Track

### Video Performance:
- Views in first 24 hours
- Average watch time
- Click-through rate to GitHub
- Comments asking questions

### Deployment Success:
- How many deploy successfully
- Common issues reported
- Time to completion
- Cost feedback

---

**Use this script to create engaging content that helps others deploy your platform!**
