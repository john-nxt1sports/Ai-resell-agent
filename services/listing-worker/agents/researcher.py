"""
Researcher Agent - Analyzes and optimizes listing content (2026 Best Practices)

Uses AI to generate SEO-optimized, platform-specific content for each marketplace.
Integrates with OpenRouter/Claude for intelligent content generation.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import os
import json
import asyncio
import structlog
import httpx

logger = structlog.get_logger()


@dataclass
class OptimizedContent:
    """Container for platform-optimized content."""
    title: str
    description: str
    keywords: List[str]
    hashtags: List[str]


class ResearcherAgent:
    """
    Analyzes products and generates SEO-optimized content for each marketplace.
    
    Features:
    - Platform-specific title optimization
    - SEO-friendly descriptions with keywords
    - Hashtag generation for Poshmark
    - Character limit compliance per platform
    - AI-powered content enhancement
    """
    
    # Platform-specific limits
    PLATFORM_LIMITS = {
        "poshmark": {"title": 80, "description": 1500},
        "ebay": {"title": 80, "description": 500000},
        "mercari": {"title": 80, "description": 1000},
    }
    
    # OpenRouter API endpoint
    OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
    
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.model = os.getenv("AI_MODEL", "anthropic/claude-3.5-sonnet")
        
        if not self.api_key:
            logger.warning("OPENROUTER_API_KEY not set - using basic optimization")
    
    async def analyze_and_optimize(self, listing: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze listing and generate optimized content for each platform.
        
        Args:
            listing: Original listing data with title, description, images, etc.
        
        Returns:
            Enhanced listing with platform-specific optimized content
        """
        logger.info(
            "Analyzing and optimizing listing",
            title=listing.get("title", "Unknown")
        )
        
        title = listing.get("title", "")
        description = listing.get("description", "")
        category = listing.get("category", "")
        brand = listing.get("brand", "")
        price = listing.get("price", 0)
        condition = listing.get("condition", "Good")
        
        # Try AI optimization if API key is available
        if self.api_key:
            try:
                optimized = await self._ai_optimize(listing)
                if optimized:
                    logger.info("AI optimization successful")
                    return optimized
            except Exception as e:
                logger.warning(f"AI optimization failed, using fallback: {e}")
        
        # Fallback to rule-based optimization
        optimized = self._rule_based_optimize(listing)
        
        logger.info(
            "Listing optimized",
            title=title,
            platforms=["poshmark", "ebay", "mercari"]
        )
        
        return optimized
    
    async def _ai_optimize(self, listing: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Use AI to generate optimized content for each platform.
        """
        prompt = self._build_optimization_prompt(listing)
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                self.OPENROUTER_API_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://listingsai.com",
                },
                json={
                    "model": self.model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an expert reseller content optimizer. Generate SEO-optimized listing content for multiple marketplaces. Always respond with valid JSON."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.7,
                    "max_tokens": 2000,
                }
            )
            
            if response.status_code != 200:
                logger.error(f"OpenRouter API error: {response.status_code}")
                return None
            
            result = response.json()
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            # Parse AI response
            return self._parse_ai_response(content, listing)
    
    def _build_optimization_prompt(self, listing: Dict[str, Any]) -> str:
        """Build the prompt for AI optimization."""
        return f"""
        Optimize this listing for Poshmark, eBay, and Mercari:
        
        ORIGINAL LISTING:
        - Title: {listing.get('title', '')}
        - Description: {listing.get('description', '')}
        - Category: {listing.get('category', '')}
        - Brand: {listing.get('brand', '')}
        - Size: {listing.get('size', '')}
        - Color: {listing.get('color', '')}
        - Condition: {listing.get('condition', '')}
        - Price: ${listing.get('price', 0)}
        
        REQUIREMENTS:
        1. Poshmark: Max 80 char title with emojis, 1500 char description with hashtags
        2. eBay: Max 80 char professional title, detailed description with SEO keywords
        3. Mercari: Max 80 char title, 1000 char casual/friendly description
        
        Respond with JSON only (no markdown):
        {{
            "poshmark_title": "...",
            "poshmark_description": "...",
            "poshmark_hashtags": ["...", "..."],
            "ebay_title": "...",
            "ebay_description": "...",
            "mercari_title": "...",
            "mercari_description": "...",
            "keywords": ["...", "..."],
            "suggested_price": 0
        }}
        """
    
    def _parse_ai_response(self, content: str, listing: Dict[str, Any]) -> Dict[str, Any]:
        """Parse AI response and merge with original listing."""
        try:
            # Clean up response (remove markdown if present)
            content = content.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            content = content.strip()
            
            ai_data = json.loads(content)
            
            return {
                **listing,
                "poshmark_title": ai_data.get("poshmark_title", listing.get("title", ""))[:80],
                "poshmark_description": ai_data.get("poshmark_description", listing.get("description", ""))[:1500],
                "poshmark_hashtags": ai_data.get("poshmark_hashtags", []),
                "ebay_title": ai_data.get("ebay_title", listing.get("title", ""))[:80],
                "ebay_description": ai_data.get("ebay_description", listing.get("description", "")),
                "mercari_title": ai_data.get("mercari_title", listing.get("title", ""))[:80],
                "mercari_description": ai_data.get("mercari_description", listing.get("description", ""))[:1000],
                "keywords": ai_data.get("keywords", []),
                "suggested_price": ai_data.get("suggested_price", listing.get("price", 0)),
            }
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse AI response: {e}")
            return self._rule_based_optimize(listing)
    
    def _rule_based_optimize(self, listing: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fallback rule-based optimization when AI is unavailable.
        """
        title = listing.get("title", "")
        description = listing.get("description", "")
        brand = listing.get("brand", "")
        price = listing.get("price", 0)
        category = listing.get("category", "")
        
        # Generate keywords from title
        keywords = [w.lower() for w in title.split() if len(w) > 2]
        if brand:
            keywords.insert(0, brand.lower())
        
        # Poshmark optimization (emoji-friendly, hashtags)
        poshmark_title = f"✨ {title} ✨"[:80]
        poshmark_desc = self._build_poshmark_description(description, brand, keywords)
        
        # eBay optimization (professional, detailed)
        ebay_title = f"{title} - Authentic - Fast Shipping"[:80]
        ebay_desc = self._build_ebay_description(description, listing)
        
        # Mercari optimization (casual, friendly)
        mercari_title = title[:80]
        mercari_desc = self._build_mercari_description(description)
        
        return {
            **listing,
            "poshmark_title": poshmark_title,
            "poshmark_description": poshmark_desc,
            "poshmark_hashtags": [f"#{k}" for k in keywords[:10]],
            "ebay_title": ebay_title,
            "ebay_description": ebay_desc,
            "mercari_title": mercari_title,
            "mercari_description": mercari_desc,
            "keywords": keywords,
            "suggested_price": price,
        }
    
    def _build_poshmark_description(self, description: str, brand: str, keywords: List[str]) -> str:
        """Build Poshmark-optimized description with hashtags."""
        hashtags = " ".join([f"#{k}" for k in keywords[:8]])
        
        posh_footer = """

💕 Thanks for shopping my closet!
📦 Ships same or next business day
💝 Bundle 2+ items for discount
🚫 No trades

"""
        
        desc = f"{description}\n{posh_footer}{hashtags}"
        return desc[:1500]
    
    def _build_ebay_description(self, description: str, listing: Dict[str, Any]) -> str:
        """Build eBay-optimized description with details."""
        brand = listing.get("brand", "")
        condition = listing.get("condition", "Pre-owned")
        size = listing.get("size", "")
        color = listing.get("color", "")
        
        details = []
        if brand:
            details.append(f"Brand: {brand}")
        if size:
            details.append(f"Size: {size}")
        if color:
            details.append(f"Color: {color}")
        details.append(f"Condition: {condition}")
        
        ebay_desc = f"""{description}

ITEM DETAILS:
{chr(10).join(f'• {d}' for d in details)}

SHIPPING & RETURNS:
• Ships within 1-2 business days
• Carefully packaged
• 30-day return policy
• Combined shipping available

Thank you for viewing my listing!"""
        
        return ebay_desc
    
    def _build_mercari_description(self, description: str) -> str:
        """Build Mercari-optimized description."""
        mercari_desc = f"""{description}

Ships quickly! Feel free to ask any questions.
Check out my other items for bundle deals! 📦"""
        
        return mercari_desc[:1000]
