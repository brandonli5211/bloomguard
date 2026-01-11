# Setup Guide for Algae Watch Frontend

## What's Missing to Make Things Render

### 1. Mapbox API Token (REQUIRED)
The map component requires a Mapbox access token to render. Without it, you'll see an error in the console and the map won't display.

### 2. Environment Variables
Create a `.env.local` file in the `frontend/` directory with your API keys.

## Quick Setup Steps

### Step 1: Get a Mapbox Token
1. Go to [Mapbox Account](https://account.mapbox.com/access-tokens/)
2. Sign up for a free account (if you don't have one)
3. Create a new access token
4. Copy the token

### Step 2: Create Environment File
Create `frontend/.env.local`:
```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_actual_token_here
```

### Step 3: Start the Development Server
```bash
cd frontend
npm run dev
```

### Step 4: View the Application
Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Keys Needed

### Frontend (Required Now)
- **Mapbox Token** (`NEXT_PUBLIC_MAPBOX_TOKEN`)
  - Purpose: Render the interactive map
  - Where to get it: https://account.mapbox.com/access-tokens/
  - Cost: Free tier available (50,000 map loads/month)

### Backend (For Later)
These are documented in `backend/README.md`:
- **Sentinel Hub** (`SENTINEL_CLIENT_ID`, `SENTINEL_CLIENT_SECRET`)
  - Purpose: Access satellite imagery data
  - Where to get it: https://www.sentinel-hub.com/
  
- **Google Gemini** (`GEMINI_API_KEY`)
  - Purpose: AI analysis of algal bloom data
  - Where to get it: https://makersuite.google.com/app/apikey

## How to Update Next.js

### Check Current Version
```bash
cd frontend
npm list next
```

### Update to Latest Version
```bash
cd frontend
npm install next@latest react@latest react-dom@latest eslint-config-next@latest --legacy-peer-deps
```

### Update to Specific Version
```bash
npm install next@^15.5.9 --legacy-peer-deps
```

## Troubleshooting

### Map Not Rendering
- Check that `.env.local` exists in the `frontend/` directory
- Verify `NEXT_PUBLIC_MAPBOX_TOKEN` is set correctly
- Restart the dev server after adding the token
- Check browser console for errors

### Build Errors
- Make sure all dependencies are installed: `npm install`
- Clear Next.js cache: `rm -rf .next`
- Restart dev server

### Port Already in Use
- Change port: `npm run dev -- -p 3001`
- Or kill the process using port 3000
