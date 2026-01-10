# Backend Setup

## Environment Variables

Create a `.env` file in this directory with the following structure:

```
SENTINEL_CLIENT_ID=your_sentinel_client_id_here
SENTINEL_CLIENT_SECRET=your_sentinel_client_secret_here
GEMINI_API_KEY=your_gemini_api_key_here
```

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`
