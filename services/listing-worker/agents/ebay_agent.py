"""
eBay Listing Agent - Creates listings on eBay (2026 Best Practices)

Uses browser-use to autonomously navigate eBay and create listings.
Handles eBay's multi-step listing process including item specifics,
shipping options, and payment settings.
"""

from typing import Dict, Any, Optional
import re
import structlog

from .base_agent import BaseMarketplaceAgent

logger = structlog.get_logger()


class EbayListingAgent(BaseMarketplaceAgent):
    """
    eBay-specific listing automation agent.
    
    eBay Listing Flow:
    1. Navigate to sell hub / create listing
    2. Search for similar items or start fresh
    3. Select category (eBay has detailed category tree)
    4. Upload images (up to 24 for free)
    5. Fill item title (max 80 chars)
    6. Fill item specifics (brand, size, color, etc.)
    7. Fill description
    8. Set condition
    9. Set pricing (fixed price or auction)
    10. Configure shipping options
    11. Review and publish
    """
    
    MARKETPLACE_NAME = "ebay"
    MARKETPLACE_URL = "https://www.ebay.com"
    CREATE_LISTING_URL = "https://www.ebay.com/sl/sell"
    MAX_STEPS = 75  # eBay has complex multi-step process
    TIMEOUT_SECONDS = 180
    
    # eBay-specific constants
    MAX_TITLE_LENGTH = 80
    MAX_DESCRIPTION_LENGTH = 500000  # eBay allows long descriptions
    MAX_IMAGES = 24
    
    def _build_task_prompt(self, listing: Dict[str, Any]) -> str:
        """
        Build eBay-specific task prompt for the agent.
        
        eBay has a complex listing flow with many options.
        """
        title = listing.get("ebay_title", listing.get("title", ""))[:self.MAX_TITLE_LENGTH]
        description = listing.get("ebay_description", listing.get("description", ""))
        price = listing.get("price", 0)
        category = listing.get("category", "")
        brand = listing.get("brand", "")
        size = listing.get("size", "")
        condition = listing.get("condition", "Pre-owned")
        color = listing.get("color", "")
        images = listing.get("images", [])[:self.MAX_IMAGES]
        
        # Map condition to eBay's condition options
        ebay_condition = self._map_condition(condition)
        
        # Build image upload instructions
        image_instructions = ""
        if images:
            image_instructions = f"""
            - Click "Add photos" button
            - Upload these images: {', '.join(images[:12])}
            - Ensure the first image is the main/cover photo
            - Wait for all images to upload completely
            """
        
        return f"""
        Create a listing on eBay with the following details:
        
        IMPORTANT: You must be logged in to your eBay seller account. 
        If you see a login page, the session has expired.
        
        STEP 1 - Navigate:
        - Go to {self.CREATE_LISTING_URL}
        - If prompted, choose "Create a listing" or "Sell an item"
        - Wait for the listing form to load
        
        STEP 2 - Category Selection:
        - If asked to search for similar items, search: "{title}"
        - Select the most appropriate category for: {category}
        - If category tree appears, navigate to the correct subcategory
        
        STEP 3 - Upload Images:
        {image_instructions}
        
        STEP 4 - Item Title:
        - Enter title: "{title}"
        - Ensure it's within 80 characters
        
        STEP 5 - Item Specifics:
        - Brand: "{brand if brand else 'Unbranded'}"
        - Size: "{size if size else 'Not specified'}"
        - Color: "{color if color else 'Not specified'}"
        - Fill any other required item specifics for this category
        
        STEP 6 - Condition:
        - Select condition: "{ebay_condition}"
        - Add condition notes if applicable
        
        STEP 7 - Description:
        - Enter description: "{description}"
        
        STEP 8 - Pricing:
        - Select "Fixed price" (Buy It Now)
        - Enter price: ${price}
        - Enable "Best Offer" if available
        
        STEP 9 - Shipping:
        - Select "Free shipping" or standard shipping option
        - Choose "USPS" or "UPS" as carrier
        - Set handling time to 1-2 business days
        
        STEP 10 - Review & List:
        - Click "List it" or "Complete listing"
        - Verify listing was created successfully
        
        STEP 11 - Get URL:
        - Copy the listing URL from the confirmation page or browser
        - URL format: ebay.com/itm/[item-number]
        
        RETURN: The complete eBay listing URL
        """
    
    def _map_condition(self, condition: str) -> str:
        """Map generic condition to eBay's condition options."""
        condition_map = {
            "new": "New with tags",
            "nwt": "New with tags",
            "nwot": "New without tags",
            "like new": "New without tags",
            "excellent": "Pre-owned",
            "good": "Pre-owned",
            "fair": "Pre-owned",
            "poor": "For parts or not working",
        }
        return condition_map.get(condition.lower(), "Pre-owned")
    
    def _extract_listing_url(self, history: Any) -> Optional[str]:
        """
        Extract the eBay listing URL from agent history.
        
        eBay URLs follow the pattern: ebay.com/itm/[item-number]
        """
        if not history:
            return None
        
        # Pattern for eBay item URLs
        url_pattern = r'https?://(?:www\.)?ebay\.com/itm/\d+'
        
        # Search through history for URLs
        history_str = str(history)
        matches = re.findall(url_pattern, history_str)
        
        if matches:
            return matches[-1]
        
        return None


class EbayDraftAgent(EbayListingAgent):
    """
    Extended eBay agent that creates draft listings for review.
    
    Useful when users want to review listings before publishing.
    """
    
    def _build_task_prompt(self, listing: Dict[str, Any]) -> str:
        """Build prompt that saves as draft instead of publishing."""
        base_prompt = super()._build_task_prompt(listing)
        
        # Modify to save as draft
        return base_prompt.replace(
            'Click "List it" or "Complete listing"',
            'Click "Save as draft" instead of publishing'
        ).replace(
            'RETURN: The complete eBay listing URL',
            'RETURN: Confirmation that draft was saved'
        )
