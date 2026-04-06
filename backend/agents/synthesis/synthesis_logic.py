import os
import json
import asyncio
from typing import List, Dict, Any
import base64
from io import BytesIO
from shared.models import Paper, SynthesizedPaper, SynthesisRequest, SynthesisResponse
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER

class SynthesisEngine:
    def __init__(self):
        self.llm_provider = os.getenv("LLM_PROVIDER", "ollama")
        self.openai_key = os.getenv("OPENAI_API_KEY")

    async def synthesize(self, request: SynthesisRequest) -> SynthesisResponse:
        """Generates a complete research paper based on selected inputs."""
        papers = request.papers
        query = request.query
        
        # 1. Generate Section by Section
        # For brevity in this implementation, we'll do a combined call but 
        # structure it heavily. In production, this would be a chain of 8+ calls.
        
        context = "\n".join([
            f"Paper: {p.title} (ID: {p.id})\nAbstract: {p.abstract[:500]}..."
            for p in papers
        ])

        prompt = f"""
        You are a senior academic researcher. Synthesize a NEW research paper based on the following context.
        Research Theme: {query}
        Source Papers:
        {context}

        The output MUST be a valid JSON object with the following fields:
        - title: A compelling new research title.
        - abstract: A professional abstract (250 words).
        - introduction: Setting the stage and defining the problem.
        - literature_review: How the source papers connect and contrast.
        - methodology: Synthesized approach based on source techniques.
        - results: Predicted or synthesized findings.
        - discussion: Critical analysis of implications.
        - conclusion: Summary and future work.
        - references: A list of the source paper titles formatted as references.

        Return ONLY the JSON. No conversational text.
        """

        try:
            # We'll use the same LLM logic as the other agents
            from agents.summary.main import get_llm_response
            
            raw_response = await get_llm_response(prompt, temperature=0.7)
            # Handle potential markdown formatting from LLM
            if "```json" in raw_response:
                raw_response = raw_response.split("```json")[1].split("```")[0].strip()
            elif "```" in raw_response:
                raw_response = raw_response.split("```")[1].split("```")[0].strip()
            
            data = json.loads(raw_response)
            
            paper = SynthesizedPaper(
                title=data.get("title", f"Synthesized Research on {query}"),
                abstract=data.get("abstract", ""),
                introduction=data.get("introduction", ""),
                literature_review=data.get("literature_review", ""),
                methodology=data.get("methodology", ""),
                results=data.get("results", ""),
                discussion=data.get("discussion", ""),
                conclusion=data.get("conclusion", ""),
                references=data.get("references", [p.title for p in papers]),
                session_id=request.session_id
            )

            # 2. Generate PDF
            pdf_bytes = self.generate_pdf(paper)
            pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')

            return SynthesisResponse(paper=paper, pdf_base64=pdf_base64)

        except Exception as e:
            print(f"[SynthesisEngine] Error: {e}")
            raise e

    def generate_pdf(self, paper: SynthesizedPaper) -> bytes:
        """Converts the synthesized paper into a professional PDF."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=72)
        
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(name='Justify', alignment=TA_JUSTIFY, fontSize=11, leading=14))
        styles.add(ParagraphStyle(name='CenterTitle', alignment=TA_CENTER, fontSize=18, leading=22, spaceAfter=20, fontName='Helvetica-Bold'))
        styles.add(ParagraphStyle(name='SectionHeader', fontSize=14, leading=18, spaceBefore=15, spaceAfter=10, fontName='Helvetica-Bold'))
        
        elements = []

        # Title
        elements.append(Paragraph(paper.title, styles['CenterTitle']))
        elements.append(Paragraph(f"Authors: {', '.join(paper.authors)}", styles['Normal']))
        elements.append(Spacer(1, 24))

        # Sections
        sections = [
            ("Abstract", paper.abstract),
            ("Introduction", paper.introduction),
            ("Literature Review", paper.literature_review),
            ("Methodology", paper.methodology),
            ("Results", paper.results),
            ("Discussion", paper.discussion),
            ("Conclusion", paper.conclusion)
        ]

        for title, content in sections:
            elements.append(Paragraph(title, styles['SectionHeader']))
            elements.append(Paragraph(content, styles['Justify']))
            elements.append(Spacer(1, 12))

        # References
        elements.append(PageBreak())
        elements.append(Paragraph("References", styles['SectionHeader']))
        for i, ref in enumerate(paper.references):
            elements.append(Paragraph(f"[{i+1}] {ref}", styles['Normal']))
            elements.append(Spacer(1, 6))

        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes
