import google.generativeai as genai
import os
import logging

logger = logging.getLogger(__name__)

# Configure the API Key
# MAKE SURE YOU HAVE 'GOOGLE_API_KEY' IN YOUR .ENV FILE


def generate_situation_report(
    risk_score: float, wind_speed: float, wind_dir: float
) -> str:
    """
    Uses Gemini to generate a short, tactical situation report.
    """
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    try:
        # Use gemini-2.5-flash (stable, latest) or gemini-2.0-flash (stable alternative)
        # Reference: https://ai.google.dev/gemini-api/docs/models
        # Stable models: gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-pro
        model = genai.GenerativeModel("gemini-2.5-flash")

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
