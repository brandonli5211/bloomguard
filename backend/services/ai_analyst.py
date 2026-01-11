import google.generativeai as genai
import os
import logging

logger = logging.getLogger(__name__)

# Configure the API Key
# MAKE SURE YOU HAVE 'GEMINI_API_KEY' IN YOUR .ENV FILE


def generate_situation_report(
    risk_score: float, wind_speed: float, wind_dir: float
) -> str:
    """
    Uses Gemini to generate a short, tactical situation report.
    """
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    try:
        model = genai.GenerativeModel("gemini-pro")

        # The prompt forces the AI to be concise and tactical
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

        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.error(f"AI Generation failed: {e}")
        return "SYSTEM OFFLINE: Unable to generate tactical report. Proceed with standard containment protocols."
