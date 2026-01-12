# BloomGuard

BloomGuard is a scientific dashboard for monitoring and responding to toxic algal blooms in real-time. It combines satellite imagery, weather data, and AI analysis to detect, predict, and plan responses to environmental threats.

Winner of Best Environmental Hack at Deltahacks! 

Demo Video:
https://vimeo.com/1153297384?share=copy

Devpost: 
https://devpost.com/software/bloomguard?_gl=1*q15acy*_gcl_au*NTc4MTI5MDU0LjE3NjEwOTU1NjM.*_ga*MjE3MzY3MjQxLjE3NjEwOTU1NjM.*_ga_0YHJK3Y10M*czE3NjgyNDY0MzQkbzI1JGcxJHQxNzY4MjQ3MDk4JGo1NCRsMCRoMA..

## Features

- Real-time satellite imagery analysis using Sentinel Hub
- Predictive drift modeling based on wind and current data
- Automated drone flight path planning
- AI-powered tactical analysis and recommendations
- Interactive map visualization with animated transitions
- Risk assessment with color-coded threat levels

## Tech Stack

- **Backend**: Python (FastAPI), Sentinel Hub, Google Generative AI
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Mapbox GL

## Quick Setup

### Prerequisites

- Python 3.13 or higher
- Node.js 18 or higher
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the `backend` directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

5. Start the backend server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the `frontend` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

4. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Running the Demo

1. Start the backend server first (from the `backend` directory):
```bash
python main.py
```

2. In a separate terminal, start the frontend (from the `frontend` directory):
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

4. The demo will automatically:
   - Animate the map from a global view to Lake Erie
   - Display the risk assessment and tactical report
   - Show satellite imagery heatmap overlay
   - Display drift prediction and drone flight paths

## API Keys Required

- **Google Generative AI**: Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Mapbox**: Get access token from [Mapbox](https://www.mapbox.com/)

## Project Structure

```
bloomguard/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── services/            # Service modules
│   │   ├── sentinel.py      # Satellite imagery processing
│   │   ├── drift.py         # Drift prediction
│   │   ├── mission.py        # Drone path planning
│   │   └── ai_analyst.py    # AI analysis
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── app/
│   │   ├── components/      # React components
│   │   ├── lib/             # API client
│   │   └── types/           # TypeScript types
│   └── package.json         # Node dependencies
└── README.md                # This file
```

## Development

### Backend Development

The backend uses FastAPI with automatic API documentation available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Frontend Development

The frontend uses Next.js with hot module replacement. Changes to components will automatically refresh in the browser.

## License

This project is part of a Deltahacks hackathon submission.
