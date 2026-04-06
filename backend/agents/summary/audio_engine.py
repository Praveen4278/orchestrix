import os
import json
import base64
import time
from typing import List
import openai
from shared.models import Paper, AudioBriefingResponse

class AudioBriefingEngine:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        # Check if it's the placeholder or empty
        if not self.api_key or "your_openai_api_key" in self.api_key:
            self.api_key = None
            self.openai_client = None
        else:
            openai.api_key = self.api_key
            self.openai_client = openai.AsyncOpenAI(api_key=self.api_key)

    async def generate_briefing(self, query: str, papers: List[Paper]) -> AudioBriefingResponse:
        """Generate an AI-narrated executive briefing script and audio."""
        from agents.summary.main import get_llm_response
        
        print(f"[AudioEngine] Starting briefing generation for query: {query}")
        
        # 1. Generate the Script (using LLM_PROVIDER - OpenAI or Ollama)
        script = await self._generate_script(query, papers, get_llm_response)
        print(f"[AudioEngine] Script generated ({len(script)} chars): {script[:50]}...")
        
        # 2. Convert Script to Speech (TTS) - Requires OpenAI
        audio_base64 = ""
        duration = 0
        
        if self.api_key:
            try:
                audio_data = await self._text_to_speech(script)
                audio_base64 = base64.b64encode(audio_data).decode('utf-8')
                print(f"[AudioEngine] Audio generated ({len(audio_data)} bytes)")
                
                # Duration calculation
                words = len(script.split())
                duration = (words / 140) * 60 # Using 140 wpm
                if words > 10 and duration < 1:
                    duration = 5.0
            except Exception as e:
                print(f"[AudioEngine] TTS Error: {e}")
        else:
            print("[AudioEngine] Skipping TTS: OpenAI API key is missing or invalid.")

        return AudioBriefingResponse(
            script=script,
            audio_base64=audio_base64,
            duration_seconds=round(duration, 1),
            total_papers=len(papers)
        )

    async def _generate_script(self, query: str, papers: List[Paper], get_llm_response_fn) -> str:
        """Create a professional narrative script summarizing the research set."""
        paper_context = "\n".join([
            f"- Title: {p.title}\n  Findings: {p.abstract[:300]}..."
            for p in papers[:8]
        ])

        prompt = f"""
        You are a professional science news anchor. Write a concise, engaging 2-minute "Executive Research Brief" 
        based on the following research query and papers.
        
        QUERY: {query}
        
        PAPERS:
        {paper_context}
        
        INSTRUCTIONS:
        1. Start with a hook: "Welcome to your Orchestrix Research Brief. Today we're looking at {query}."
        2. Synthesize the core findings. Tell a story of where the research is heading.
        3. Highlight one or two major breakthroughs.
        4. End with a forward-looking conclusion.
        5. Keep it under 300 words.
        6. Use a professional yet conversational tone.
        7. Return ONLY the plain text script. No markdown, no headers.
        """

        try:
            # Use the shared LLM response function (OpenAI or Ollama)
            # Pass format="text" to get a plain string instead of JSON
            script = await get_llm_response_fn(prompt, temperature=0.7, max_tokens=1000)
            return script.strip()
        except Exception as e:
            print(f"[AudioEngine] Script Generation Error: {e}")
            return f"Welcome to your briefing on {query}. We analyzed {len(papers)} papers today. Key trends include advances in the field and emerging methodologies. Stay tuned for more deep dives."

    async def _text_to_speech(self, text: str) -> bytes:
        """Call OpenAI TTS API to generate audio bytes."""
        response = await self.openai_client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=text
        )
        return response.content

