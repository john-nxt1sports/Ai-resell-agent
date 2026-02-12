"""
Researcher Agent - Live Market Intelligence for Reseller Listings (2026 Best Practices)

True web researcher that uses google/gemini-2.5-flash:online to search the
live internet for real-time pricing, sold comps, trending keywords, and
competitor analysis.  Results feed directly into platform-specific listing
optimization so the seller always prices competitively and uses the
highest-converting copy.

Pipeline:
    1. Market Research  – search eBay sold comps, Amazon pricing, Poshmark/Mercari actives
    2. Pricing Intel    – calculate competitive price range from live data
    3. SEO Research     – pull trending search terms & top-performing title patterns
    4. Content Gen      – produce platform-specific titles, descriptions, hashtags
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
import os
import json
import re
import asyncio
import time
import structlog
import httpx

logger = structlog.get_logger()


# ---------------------------------------------------------------------------
# Data containers
# ---------------------------------------------------------------------------

@dataclass
class MarketComp:
    """A single comparable listing found via research."""
    title: str
    price: float
    sold: bool
    platform: str
    url: str = ""


@dataclass
class MarketResearch:
    """Full market research results for a product."""
    avg_sold_price: float = 0.0
    lowest_active_price: float = 0.0
    highest_sold_price: float = 0.0
    recommended_price: float = 0.0
    price_range_low: float = 0.0
    price_range_high: float = 0.0
    num_comps_found: int = 0
    trending_keywords: List[str] = field(default_factory=list)
    top_selling_titles: List[str] = field(default_factory=list)
    comps: List[MarketComp] = field(default_factory=list)
    demand_level: str = "medium"  # low / medium / high
    market_summary: str = ""


@dataclass
class OptimizedContent:
    """Container for platform-optimized content."""
    title: str
    description: str
    keywords: List[str]
    hashtags: List[str]


# ---------------------------------------------------------------------------
# Researcher Agent
# ---------------------------------------------------------------------------

class ResearcherAgent:
    """
    True web-search-powered market researcher + listing optimizer.

    Uses ``google/gemini-2.5-flash:online`` via OpenRouter which performs
    real-time web searches, returning live pricing data, sold comps,
    trending keywords, and competitor analysis.

    Features:
        - Live eBay sold comps & active listing prices
        - Amazon / Walmart price checks
        - Poshmark & Mercari active comp analysis
        - Trending keyword extraction from top-performing listings
        - AI-generated platform-specific titles & descriptions
        - Competitive pricing recommendation based on real data
        - Demand signal analysis (supply vs. recent solds)
    """

    # Platform content limits
    PLATFORM_LIMITS = {
        "poshmark": {"title": 80, "description": 1500},
        "ebay":     {"title": 80, "description": 500_000},
        "mercari":  {"title": 80, "description": 1000},
        "flyp":     {"title": 255, "description": 1000},
    }

    OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

    # The online model that actually searches the web
    RESEARCH_MODEL = "google/gemini-2.5-flash:online"

    # Faster model for content generation (no web search needed)
    CONTENT_MODEL = "google/gemini-2.5-flash"

    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            logger.warning("OPENROUTER_API_KEY not set – research will use fallback")

    # ------------------------------------------------------------------
    # Public interface  (same signature as before for drop-in compat)
    # ------------------------------------------------------------------

    async def analyze_and_optimize(self, listing: Dict[str, Any]) -> Dict[str, Any]:
        """
        Full pipeline: research → price → optimize content.

        Args:
            listing: Raw listing dict from the queue.

        Returns:
            Enriched listing dict with platform-specific content and
            market intelligence fields the agents can use.
        """
        title = listing.get("title", "Unknown")
        brand = listing.get("brand", "")
        logger.info("researcher.start", title=title, brand=brand)
        t0 = time.time()

        # ── Step 1: Live market research ──────────────────────────────
        research: Optional[MarketResearch] = None
        if self.api_key:
            try:
                research = await self._live_market_research(listing)
                logger.info(
                    "researcher.market_research_done",
                    comps=research.num_comps_found if research else 0,
                    recommended_price=research.recommended_price if research else 0,
                    elapsed=f"{time.time() - t0:.1f}s",
                )
            except Exception as e:
                logger.warning(f"researcher.market_research_failed: {e}")

        # ── Step 2: Generate platform-specific content ────────────────
        optimized: Optional[Dict[str, Any]] = None
        if self.api_key:
            try:
                optimized = await self._generate_platform_content(listing, research)
                logger.info("researcher.content_generation_done")
            except Exception as e:
                logger.warning(f"researcher.content_generation_failed: {e}")

        # ── Fallback if AI unavailable ────────────────────────────────
        if not optimized:
            optimized = self._rule_based_optimize(listing)

        # ── Attach research metadata for downstream agents ────────────
        if research:
            optimized["market_research"] = {
                "avg_sold_price": research.avg_sold_price,
                "lowest_active_price": research.lowest_active_price,
                "highest_sold_price": research.highest_sold_price,
                "recommended_price": research.recommended_price,
                "price_range": [research.price_range_low, research.price_range_high],
                "demand_level": research.demand_level,
                "num_comps": research.num_comps_found,
                "trending_keywords": research.trending_keywords,
                "top_selling_titles": research.top_selling_titles,
                "market_summary": research.market_summary,
            }
            # Suggest price only if user didn't explicitly set one,
            # or if research shows they're way off market
            user_price = listing.get("price", 0)
            if research.recommended_price > 0:
                optimized["suggested_price"] = research.recommended_price
                if user_price > 0:
                    diff_pct = abs(user_price - research.recommended_price) / user_price * 100
                    if diff_pct > 30:
                        logger.info(
                            "researcher.price_advisory",
                            user_price=user_price,
                            recommended=research.recommended_price,
                            diff_pct=f"{diff_pct:.0f}%",
                        )

        elapsed = time.time() - t0
        logger.info("researcher.complete", elapsed=f"{elapsed:.1f}s")
        return optimized

    # ------------------------------------------------------------------
    # Step 1: Live Market Research  (uses :online model)
    # ------------------------------------------------------------------

    async def _live_market_research(self, listing: Dict[str, Any]) -> MarketResearch:
        """
        Call Gemini :online to search the real web for pricing data and comps.
        """
        title = listing.get("title", "")
        brand = listing.get("brand", "")
        category = listing.get("category", "")
        condition = listing.get("condition", "Pre-owned")
        size = listing.get("size", "")
        color = listing.get("color", "")
        user_price = listing.get("price", 0)

        # Get the first product image for visual identification
        images = listing.get("images", [])
        first_image = images[0] if images else None
        if first_image:
            logger.info("researcher.using_product_image", image_url=first_image[:80])

        # Build a focused search product string
        product_str = title
        if brand and brand.lower() not in title.lower():
            product_str = f"{brand} {title}"

        prompt = f"""You are a professional reseller market research analyst. Search the internet RIGHT NOW for real-time market data on this product.

I have attached a photo of the actual product. Use it to visually identify the exact item, brand, model, colorway, and condition. This visual context should guide your search for accurate comparables.

PRODUCT: {product_str}
CATEGORY: {category}
CONDITION: {condition}
SIZE: {size}
COLOR: {color}
SELLER'S ASKING PRICE: ${user_price}

RESEARCH TASKS (search the web for each):

1. EBAY SOLD COMPS: Search eBay for recently sold listings of this exact product or very similar items. Find the actual sold prices for the last 5-10 comparable sales. Use eBay's "Sold Items" filter.

2. EBAY ACTIVE LISTINGS: Search eBay for currently active listings of the same product. Note the lowest current price.

3. AMAZON PRICE CHECK: Search Amazon for this product (new price) to establish retail baseline.

4. POSHMARK COMPS: Search Poshmark for active and sold listings of this product. Note pricing patterns.

5. MERCARI COMPS: Search Mercari for active and sold listings of this product. Note pricing patterns.

6. TRENDING KEYWORDS: Based on the top-performing listings you find, what search keywords and title patterns are sellers using that get the most sales?

Return your findings as JSON ONLY (no markdown, no code blocks):
{{
    "avg_sold_price": 0.00,
    "lowest_active_price": 0.00,
    "highest_sold_price": 0.00,
    "recommended_price": 0.00,
    "price_range_low": 0.00,
    "price_range_high": 0.00,
    "num_comps_found": 0,
    "demand_level": "low|medium|high",
    "trending_keywords": ["keyword1", "keyword2", "keyword3"],
    "top_selling_titles": ["title example 1", "title example 2"],
    "comps": [
        {{"title": "...", "price": 0.00, "sold": true, "platform": "ebay", "url": "..."}},
        {{"title": "...", "price": 0.00, "sold": false, "platform": "mercari", "url": "..."}}
    ],
    "market_summary": "Brief 2-3 sentence market analysis including supply/demand and pricing recommendation."
}}

IMPORTANT:
- recommended_price should be competitive but profitable – typically around the average sold price
- If the seller's asking price of ${user_price} is significantly above or below market, note this in market_summary
- Include REAL URLs you find during search when possible
- demand_level: "high" if items sell quickly/many solds, "low" if few solds and many active listings
- Return ONLY the JSON object, nothing else"""

        response = await self._call_openrouter(
            model=self.RESEARCH_MODEL,
            system="You are a market research analyst for resellers. Search the web for real-time pricing data, sold comparables, and trending keywords. Always respond with valid JSON only.",
            user_prompt=prompt,
            image_urls=[first_image] if first_image else None,
            temperature=0.3,
            max_tokens=3000,
            timeout=90.0,  # web search can take longer
        )

        if not response:
            return MarketResearch()

        return self._parse_research_response(response)

    # ------------------------------------------------------------------
    # Step 2: Generate Platform Content  (uses fast model, no web)
    # ------------------------------------------------------------------

    async def _generate_platform_content(
        self,
        listing: Dict[str, Any],
        research: Optional[MarketResearch],
    ) -> Optional[Dict[str, Any]]:
        """
        Generate SEO-optimized, platform-specific titles and descriptions
        using market research intelligence.
        """
        title = listing.get("title", "")
        description = listing.get("description", "")
        brand = listing.get("brand", "")
        category = listing.get("category", "")
        condition = listing.get("condition", "")
        size = listing.get("size", "")
        color = listing.get("color", "")
        price = listing.get("price", 0)

        # Inject research intelligence into the content prompt
        research_context = ""
        if research and research.num_comps_found > 0:
            research_context = f"""
MARKET INTELLIGENCE (use this to write better listings):
- Average sold price: ${research.avg_sold_price:.2f}
- Recommended price: ${research.recommended_price:.2f}
- Demand level: {research.demand_level}
- Trending keywords buyers search for: {', '.join(research.trending_keywords[:10])}
- Top-performing title patterns: {json.dumps(research.top_selling_titles[:3])}
- Market summary: {research.market_summary}

Use the trending keywords naturally in titles and descriptions. Model your titles after the top-performing patterns above."""

        prompt = f"""Create optimized listing content for three marketplaces using actual market data.
You are a professional reseller writing listings that SELL. Follow the exact format below.

PRODUCT INFO:
- Title: {title}
- Description: {description}
- Brand: {brand}
- Category: {category}
- Condition: {condition}
- Size: {size}
- Color: {color}
- Price: ${price}
{research_context}

═══════════════════════════════════════════
REQUIRED TITLE FORMAT (all platforms):
═══════════════════════════════════════════
[Brand] [Model/Style Name] [Key Feature] [Item Type] [Gender/Audience] [Descriptor]

Example: "Tanya Taylor Aliyah Lemon Zest Puff Sleeve Top Womens Designer"
Example: "Nike Air Jordan 1 Retro High OG Chicago Mens Sneakers"
Example: "Sage the Label Womens Blazer Jacket Contemporary Structured Coat"

Rules:
- Brand FIRST, always
- Include model/style name if known
- Include color or colorway
- Include key distinguishing feature (puff sleeve, structured, retro, etc.)
- End with item type + audience (Womens, Mens, Unisex)
- NO emojis in titles
- NO all-caps words (except brand acronyms like "NWT" or "OG")

═══════════════════════════════════════════
REQUIRED DESCRIPTION FORMAT (all platforms):
═══════════════════════════════════════════
Paragraph 1: Opening hook - 2-3 sentences about what makes this piece special, the brand story, and the colorway/style.

Paragraph 2: Design details - 2-3 sentences about the construction, fit, features, and what it pairs well with. Include occasions it's good for.

Paragraph 3: Structured details block using this EXACT format:
Brand: [brand]
Style: [model/style name]
Color: [color/colorway]
[Key Feature Label]: [value]
Fit: [fit description]
Look: [aesthetic descriptors]
Occasion: [usage occasions]

Size: [size info]

FAST SHIPPING

Thanks for shopping 😊

PLATFORM REQUIREMENTS:

1. POSHMARK (social/trendy marketplace):
   - Title: Max 80 chars. Follow the title format above. Include trending keywords from research.
   - Description: Max 1500 chars. Follow the description format above. End with 5-15 hashtags on a new line.

2. EBAY (professional marketplace):
   - Title: Max 80 chars. Follow the title format above. Front-load brand + key specs. NO emojis.
   - Description: Max 4000 chars. Follow the description format above. Professional tone. Add shipping/returns info at bottom.

3. MERCARI (casual marketplace):
   - Title: Max 80 chars. Follow the title format above. NO emojis, NO special unicode. Plain ASCII only.
   - Description: Max 1000 chars. Follow the description format above. NO emojis except the 😊 at the end. Plain ASCII text only.

Return JSON ONLY (no markdown):
{{
    "poshmark_title": "...",
    "poshmark_description": "...",
    "poshmark_hashtags": ["#brand", "#style", "..."],
    "ebay_title": "...",
    "ebay_description": "...",
    "mercari_title": "...",
    "mercari_description": "...",
    "keywords": ["kw1", "kw2", "..."]
}}

CRITICAL FORMATTING RULES:
- Inside JSON string values, use actual newline characters for line breaks — NOT the literal text backslash-n
- Do NOT use markdown formatting (no **, no *, no #headers)
- Use dashes (-) for bullet points, not asterisks
- Keep all content as clean plain text
- The description MUST follow the 3-paragraph + details block format shown above"""

        response = await self._call_openrouter(
            model=self.CONTENT_MODEL,
            system="You are an expert e-commerce copywriter specializing in resale marketplaces. Write compelling, SEO-optimized listing content. Use plain text only (no markdown). Always respond with valid JSON only.",
            user_prompt=prompt,
            temperature=0.7,
            max_tokens=2500,
        )

        if not response:
            return None

        return self._parse_content_response(response, listing, research)

    # ------------------------------------------------------------------
    # OpenRouter API caller
    # ------------------------------------------------------------------

    async def _call_openrouter(
        self,
        model: str,
        system: str,
        user_prompt: str,
        image_urls: Optional[List[str]] = None,
        temperature: float = 0.5,
        max_tokens: int = 2000,
        timeout: float = 60.0,
    ) -> Optional[str]:
        """Make an OpenRouter API call, optionally with images (multimodal)."""

        # Build user message content — multimodal if images provided
        if image_urls:
            user_content: Any = []
            for url in image_urls:
                user_content.append({
                    "type": "image_url",
                    "image_url": {"url": url},
                })
            user_content.append({"type": "text", "text": user_prompt})
        else:
            user_content = user_prompt

        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                response = await client.post(
                    self.OPENROUTER_API_URL,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://listingsai.com",
                    },
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system},
                            {"role": "user", "content": user_content},
                        ],
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                    },
                )

                if response.status_code != 200:
                    body = response.text[:500]
                    logger.error(
                        "openrouter.api_error",
                        status=response.status_code,
                        model=model,
                        body=body,
                    )
                    return None

                data = response.json()
                content = (
                    data.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                )
                return content

            except httpx.TimeoutException:
                logger.error("openrouter.timeout", model=model, timeout=timeout)
                return None
            except Exception as e:
                logger.error("openrouter.call_failed", model=model, error=str(e))
                return None

    # ------------------------------------------------------------------
    # Response parsers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_json(text: str) -> str:
        """Extract JSON from a response that might include markdown fences or prose."""
        text = text.strip()
        # Remove markdown code fences
        if "```" in text:
            parts = text.split("```")
            for part in parts:
                part = part.strip()
                if part.startswith("json"):
                    part = part[4:].strip()
                if part.startswith("{"):
                    text = part
                    break
        # Try to find JSON object boundaries
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            text = text[start:end]
        return text

    def _parse_research_response(self, content: str) -> MarketResearch:
        """Parse market research JSON into MarketResearch dataclass."""
        try:
            cleaned = self._extract_json(content)
            data = json.loads(cleaned)

            comps = []
            for c in data.get("comps", []):
                comps.append(MarketComp(
                    title=c.get("title", ""),
                    price=float(c.get("price", 0)),
                    sold=bool(c.get("sold", False)),
                    platform=c.get("platform", ""),
                    url=c.get("url", ""),
                ))

            return MarketResearch(
                avg_sold_price=float(data.get("avg_sold_price", 0)),
                lowest_active_price=float(data.get("lowest_active_price", 0)),
                highest_sold_price=float(data.get("highest_sold_price", 0)),
                recommended_price=float(data.get("recommended_price", 0)),
                price_range_low=float(data.get("price_range_low", 0)),
                price_range_high=float(data.get("price_range_high", 0)),
                num_comps_found=int(data.get("num_comps_found", 0)),
                trending_keywords=data.get("trending_keywords", []),
                top_selling_titles=data.get("top_selling_titles", []),
                comps=comps,
                demand_level=data.get("demand_level", "medium"),
                market_summary=data.get("market_summary", ""),
            )
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.warning(f"researcher.parse_research_failed: {e}")
            return MarketResearch()

    @staticmethod
    def _clean_newlines(text: str) -> str:
        """Replace literal backslash-n sequences with real newlines."""
        if not text:
            return text
        # Replace literal \n (escaped in JSON) with actual newline
        text = text.replace("\\n", "\n")
        # Collapse triple+ newlines down to double
        while "\n\n\n" in text:
            text = text.replace("\n\n\n", "\n\n")
        return text.strip()

    def _parse_content_response(
        self,
        content: str,
        listing: Dict[str, Any],
        research: Optional[MarketResearch],
    ) -> Dict[str, Any]:
        """Parse content generation JSON and merge into listing."""
        try:
            cleaned = self._extract_json(content)
            ai = json.loads(cleaned)

            suggested_price = listing.get("price", 0)
            if research and research.recommended_price > 0:
                suggested_price = research.recommended_price

            return {
                **listing,
                "poshmark_title": ai.get("poshmark_title", listing.get("title", ""))[:80],
                "poshmark_description": self._clean_newlines(
                    ai.get("poshmark_description", listing.get("description", ""))
                )[:1500],
                "poshmark_hashtags": ai.get("poshmark_hashtags", []),
                "ebay_title": ai.get("ebay_title", listing.get("title", ""))[:80],
                "ebay_description": self._clean_newlines(
                    ai.get("ebay_description", listing.get("description", ""))
                ),
                "mercari_title": self._strip_emojis(
                    ai.get("mercari_title", listing.get("title", ""))
                )[:80],
                "mercari_description": self._strip_emojis(
                    self._clean_newlines(
                        ai.get("mercari_description", listing.get("description", ""))
                    )
                )[:1000],
                "keywords": ai.get("keywords", []),
                "suggested_price": suggested_price,
            }
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"researcher.parse_content_failed: {e}")
            return self._rule_based_optimize(listing)

    # ------------------------------------------------------------------
    # Fallback: Rule-based optimization (no API key)
    # ------------------------------------------------------------------

    def _rule_based_optimize(self, listing: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback when AI/API is unavailable. Uses professional reseller format."""
        title = listing.get("title", "")
        description = listing.get("description", "")
        brand = listing.get("brand", "")
        category = listing.get("category", "")
        condition = listing.get("condition", "")
        size = listing.get("size", "")
        color = listing.get("color", "")
        price = listing.get("price", 0)

        keywords = [w.lower() for w in title.split() if len(w) > 2]
        if brand:
            keywords.insert(0, brand.lower())

        # Professional reseller title format: Brand + Style + Feature + Type + Audience
        # Ensure brand is at the front
        if brand and not title.lower().startswith(brand.lower()):
            base_title = f"{brand} {title}"
        else:
            base_title = title

        poshmark_title = base_title[:80]
        ebay_title = base_title[:80]
        mercari_title = self._strip_emojis(base_title)[:80]

        # Build professional description with details block
        details_block = []
        if brand:
            details_block.append(f"Brand: {brand}")
        if color:
            details_block.append(f"Color: {color}")
        if condition:
            details_block.append(f"Condition: {condition}")
        if size:
            details_block.append(f"Size: {size}")
        if category:
            details_block.append(f"Category: {category}")
        details_str = "\n".join(details_block)

        pro_description = (
            f"{description}\n\n"
            f"{details_str}\n\n"
            "FAST SHIPPING\n\n"
            "Thanks for shopping 😊"
        )

        poshmark_hashtags = [f"#{k}" for k in keywords[:10]]
        poshmark_desc = (
            f"{pro_description}\n\n"
            f"{' '.join(poshmark_hashtags)}"
        )[:1500]

        ebay_desc = (
            f"{pro_description}\n\n"
            "SHIPPING & RETURNS:\n"
            "- Ships within 1-2 business days\n"
            "- Carefully packaged\n"
            "- 30-day return policy\n\n"
            "Thank you for viewing my listing!"
        )

        mercari_desc = self._strip_emojis(pro_description)[:1000]

        return {
            **listing,
            "poshmark_title": poshmark_title,
            "poshmark_description": poshmark_desc,
            "poshmark_hashtags": poshmark_hashtags,
            "ebay_title": ebay_title,
            "ebay_description": ebay_desc,
            "mercari_title": mercari_title,
            "mercari_description": mercari_desc,
            "keywords": keywords,
            "suggested_price": price,
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _strip_emojis(text: str) -> str:
        """Remove emojis and special unicode characters that Mercari rejects."""
        emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"
            "\U0001F300-\U0001F5FF"
            "\U0001F680-\U0001F6FF"
            "\U0001F1E0-\U0001F1FF"
            "\U00002702-\U000027B0"
            "\U000024C2-\U0001F251"
            "\U0001f926-\U0001f937"
            "\U00010000-\U0010ffff"
            "\u2640-\u2642"
            "\u2600-\u2B55"
            "\u200d\u23cf\u23e9\u231a\ufe0f\u3030"
            "]+",
            flags=re.UNICODE,
        )
        return emoji_pattern.sub("", text).strip()

    def _build_poshmark_description(self, description: str, brand: str, keywords: List[str]) -> str:
        """Build Poshmark-optimized description with hashtags."""
        hashtags = " ".join([f"#{k}" for k in keywords[:8]])
        footer = (
            "\n\n"
            "Thanks for shopping my closet!\n"
            "Ships same or next business day\n"
            "Bundle 2+ items for discount\n"
            "\n"
        )
        return f"{description}{footer}{hashtags}"[:1500]

    def _build_ebay_description(self, description: str, listing: Dict[str, Any]) -> str:
        """Build eBay-optimized description with details."""
        details = []
        for key, label in [("brand", "Brand"), ("size", "Size"), ("color", "Color"), ("condition", "Condition")]:
            val = listing.get(key, "")
            if val:
                details.append(f"- {label}: {val}")

        return (
            f"{description}\n\n"
            f"ITEM DETAILS:\n{chr(10).join(details)}\n\n"
            "SHIPPING & RETURNS:\n"
            "- Ships within 1-2 business days\n"
            "- Carefully packaged\n"
            "- 30-day return policy\n\n"
            "Thank you for viewing my listing!"
        )

    def _build_mercari_description(self, description: str) -> str:
        """Build Mercari-optimized description (NO emojis)."""
        return self._strip_emojis(
            f"{description}\n\nShips quickly! Feel free to ask any questions.\n"
            "Check out my other items for bundle deals!"
        )[:1000]
