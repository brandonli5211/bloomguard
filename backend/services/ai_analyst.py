import os
import logging
from dotenv import load_dotenv
from openai import OpenAI

logger = logging.getLogger(__name__)

def generate_situation_report(risk_score: float, wind_speed: float, wind_dir: float) -> str:
    """
    Uses OpenRouter to access Gemini Flash 2.0 for the tactical report.
    """
    load_dotenv()
    
    # 1. Get the OpenRouter Key
    api_key = os.getenv("OPENROUTER_API_KEY")
    
    if not api_key:
        logger.error("CRITICAL: OPENROUTER_API_KEY is missing.")
        return "SYSTEM ERROR: API Key missing."

    try:
        # 2. Configure Client
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )

        prompt = f"""
        You are an environmental crisis commander. 
        Current Status:
        - Algae Toxicity Risk: {risk_score:.2f} (Scale 0-1.0)
        - Wind Speed: {wind_speed} km/h
        - Wind Direction: {wind_dir} degrees
        
        Task: Write a 2-sentence SITUATION REPORT for the dashboard.
        1. First sentence: Assess the immediate threat (drift direction, intensity).
        2. Second sentence: Recommend a specific drone deployment strategy.
        
        Tone: Urgent, technical, precise. 
        Output text only. No markdown formatting.
        """

        # 3. Call Gemini Flash 2.0
        completion = client.chat.completions.create(
            model="google/gemini-2.0-flash-001", 
            messages=[
                {"role": "system", "content": "You are a tactical environmental analyst."},
                {"role": "user", "content": prompt}
            ]
        )

        return completion.choices[0].message.content

    except Exception as e:
        logger.error(f"AI Generation failed: {e}")
        return "SYSTEM OFFLINE: Unable to connect to Command Uplink."
