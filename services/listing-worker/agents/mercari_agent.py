"""
Mercari Listing Agent - Creates listings on Mercari (2026 Best Practices)

Uses browser-use to autonomously navigate Mercari and create listings.
Mercari has a simpler, mobile-first listing flow compared to other platforms.
"""

from typing import Dict, Any, Optional
import re
import structlog

from .base_agent import BaseMarketplaceAgent

logger = structlog.get_logger()


class MercariListingAgent(BaseMarketplaceAgent):
    """
    Mercari-specific listing automation agent.
    
    Mercari Listing Flow (simpler than eBay/Poshmark):
    1. Navigate to sell page
    2. Upload photos (up to 12)
    3. Enter title
    4. Enter description
    5. Select category
    6. Select condition
    7. Enter brand (optional)
    8. Set price
    9. Configure shipping
    10. Publish listing
    """
    
    MARKETPLACE_NAME = "mercari"
    MARKETPLACE_URL = "https://www.mercari.com"
    CREATE_LISTING_URL = "https://www.mercari.com/sell"
    MAX_STEPS = 45  # Mercari has simpler flow
    TIMEOUT_SECONDS = 120
    
    # Mercari-specific constants
    MAX_TITLE_LENGTH = 80
    MAX_DESCRIPTION_LENGTH = 1000
    MAX_IMAGES = 12
    MIN_PRICE = 1
    MAX_PRICE = 2000
    
    def _build_task_prompt(self, listing: Dict[str, Any]) -> str:
        """
        Build Mercari-specific task prompt for the agent.
        
        Mercari has a cleaner, more straightforward listing interface.
        """
        title = listing.get("mercari_title", listing.get("title", ""))[:self.MAX_TITLE_LENGTH]
        description = listing.get("mercari_description", listing.get("description", ""))[:self.MAX_DESCRIPTION_LENGTH]
        price = max(self.MIN_PRICE, min(listing.get("price", 0), self.MAX_PRICE))
        category = listing.get("category", "")
        brand = listing.get("brand", "")
        condition = listing.get("condition", "Good")
        color = listing.get("color", "")
        images = listing.get("images", [])[:self.MAX_IMAGES]
        
        # Map condition to Mercari's options
        mercari_condition = self._map_condition(condition)
        
        # Build image upload instructions
        image_instructions = ""
        if images:
            image_instructions = f"""
            - Click the photo upload area or "Add photos" button
            - Upload these images: {', '.join(images[:10])}
            - The first image will be the cover photo
            - Ensure all images upload successfully
            """
        
        return f"""
        Create a listing on Mercari with the following details:
        
        IMPORTANT: You must be logged into Mercari. 
        If you see a login or signup page, the session has expired.
        
        STEP 1 - Navigate:
        - Go to {self.CREATE_LISTING_URL}
        - Wait for the listing form to load
        
        STEP 2 - Upload Photos:
        {image_instructions}
        
        STEP 3 - Title:
        - Enter listing title: "{title}"
        
        STEP 4 - Description:
        - Enter description: "{description}"
        
        STEP 5 - Category:
        - Click to select category
        - Navigate to: {category if category else "Most appropriate category"}
        - Select the most specific subcategory available
        
        STEP 6 - Item Details:
        - Condition: Select "{mercari_condition}"
        - Brand: "{brand if brand else 'No Brand / Unbranded'}"
        - Color: "{color if color else 'Not specified'}" (if available)
        
        STEP 7 - Price:
        - Enter price: ${price}
        - Mercari will show the fee and your earnings
        
        STEP 8 - Shipping:
        - Select shipping method (Mercari prepaid label recommended)
        - Choose appropriate package size based on item
        - Seller pays shipping (standard)
        
        STEP 9 - Publish:
        - Review all details
        - Click "List" or "Publish" button
        - Wait for confirmation
        
        STEP 10 - Get URL:
        - Copy the listing URL from browser
        - URL format: mercari.com/item/[item-id]
        
        RETURN: The complete Mercari listing URL
        """
    
    def _map_condition(self, condition: str) -> str:
        """Map generic condition to Mercari's condition options."""
        condition_map = {
            "new": "New",
            "nwt": "New",
            "nwot": "Like New",
            "like new": "Like New",
            "excellent": "Good",
            "good": "Good",
            "fair": "Fair",
            "poor": "Poor",
        }
        return condition_map.get(condition.lower(), "Good")
    
    def _extract_listing_url(self, history: Any) -> Optional[str]:
        """
        Extract the Mercari listing URL from agent history.
        
        Mercari URLs follow the pattern: mercari.com/item/[item-id]
        or mercari.com/us/item/[item-id]
        """
        if not history:
            return None
        
        # Pattern for Mercari item URLs
        url_pattern = r'https?://(?:www\.)?mercari\.com(?:/us)?/item/m\d+'
        
        # Search through history for URLs
        history_str = str(history)
        matches = re.findall(url_pattern, history_str)
        
        if matches:
            return matches[-1]
        
        return None


class MercariSmartPricingAgent(MercariListingAgent):
    """
    Extended Mercari agent with smart pricing features.
    
    Uses Mercari's price suggestion and shipping estimation.
    """
    
    def _build_task_prompt(self, listing: Dict[str, Any]) -> str:
        """Build prompt that uses Mercari's smart pricing suggestions."""
        base_prompt = super()._build_task_prompt(listing)
        
        # Add smart pricing instruction
        smart_pricing_note = """
        
        PRICING TIP:
        - If Mercari suggests a price range, note it for reference
        - Use the suggested price if it's close to the listed price
        - Enable "Smart Pricing" if available for faster sales
        """
        
        return base_prompt + smart_pricing_note
