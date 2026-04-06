import os
import json
import asyncio
from typing import List, Dict, Any, Optional
import openai
from shared.models import Paper, PaperClaim, Conflict, ContradictionResponse

class ContradictionEngine:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if self.api_key:
            openai.api_key = self.api_key

    async def extract_claims(self, papers: List[Paper]) -> List[PaperClaim]:
        """Extract key claims from each paper using LLM."""
        tasks = [self._extract_single_claim(paper) for paper in papers]
        return await asyncio.gather(*tasks)

    async def _extract_single_claim(self, paper: Paper) -> PaperClaim:
        if not self.api_key:
            return PaperClaim(
                paper_id=paper.id,
                title=paper.title,
                claim="Claim extraction unavailable (no API key)",
                variable="Unknown",
                outcome="Unknown"
            )

        prompt = f"""
        Extract the main research claim from this paper. 
        Title: {paper.title}
        Abstract: {paper.abstract[:1000]}

        Return a JSON object with:
        - claim: One concise sentence summary of the main finding.
        - variable: The primary subject/method being studied.
        - outcome: The result (improves, decreases, no effect, etc).
        - methodology: Brief mention of dataset or technique used.
        """

        try:
            client = openai.AsyncOpenAI(api_key=self.api_key)
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": "You are a research analyst. Return valid JSON."},
                          {"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            data = json.loads(response.choices[0].message.content)
            return PaperClaim(
                paper_id=paper.id,
                title=paper.title,
                claim=data.get("claim", ""),
                variable=data.get("variable", ""),
                outcome=data.get("outcome", ""),
                methodology=data.get("methodology", "")
            )
        except Exception as e:
            print(f"Error extracting claim for {paper.id}: {e}")
            return PaperClaim(
                paper_id=paper.id,
                title=paper.title,
                claim=f"Error: {str(e)}",
                variable="Error",
                outcome="Error"
            )

    async def detect_conflicts(self, claims: List[PaperClaim]) -> List[Conflict]:
        """Compare claims across papers to find contradictions."""
        if len(claims) < 2 or not self.api_key:
            return []

        conflicts = []
        # To avoid O(n^2), we'll limit comparisons or use a smarter grouping
        # For now, we'll do pairwise for small sets (up to 10 papers)
        subset = claims[:10]
        
        comparison_tasks = []
        for i in range(len(subset)):
            for j in range(i + 1, len(subset)):
                comparison_tasks.append(self._compare_claims(subset[i], subset[j]))
        
        results = await asyncio.gather(*comparison_tasks)
        return [r for r in results if r is not None]

    async def _compare_claims(self, claim1: PaperClaim, claim2: PaperClaim) -> Optional[Conflict]:
        prompt = f"""
        Compare these two research claims and determine if they CONTRADICT or DISAGREE.
        
        Paper 1: {claim1.title}
        Claim 1: {claim1.claim}
        Method 1: {claim1.methodology}

        Paper 2: {claim2.title}
        Claim 2: {claim2.claim}
        Method 2: {claim2.methodology}

        If they contradict (different results for the same topic), return a JSON object with:
        - topic: The specific research question.
        - reason: WHY they might differ (different datasets, methods, etc).
        - confidence: Float 0-1.
        
        If they do NOT contradict, return {{"contradict": false}}.
        """

        try:
            client = openai.AsyncOpenAI(api_key=self.api_key)
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": "Analyze research conflicts. Return valid JSON."},
                          {"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            data = json.loads(response.choices[0].message.content)
            
            if data.get("contradict") is False:
                return None

            return Conflict(
                topic=data.get("topic", "Research Finding"),
                paper_1={"id": claim1.paper_id, "title": claim1.title, "claim": claim1.claim},
                paper_2={"id": claim2.paper_id, "title": claim2.title, "claim": claim2.claim},
                reason=data.get("reason", "Differing outcomes observed."),
                confidence=data.get("confidence", 0.7)
            )
        except Exception:
            return None

    def calculate_conflict_score(self, conflicts: List[Conflict], total_papers: int) -> int:
        if total_papers == 0: return 0
        # Basic heuristic: ratio of conflicts to possible pairs
        # Or just scaled by severity/confidence
        if not conflicts: return 0
        
        severity_sum = sum(c.confidence for c in conflicts)
        score = min(100, int((severity_sum / total_papers) * 50))
        return score
