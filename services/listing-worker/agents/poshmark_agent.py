"""
Poshmark Listing Agent - Creates listings on Poshmark (2026 Best Practices)

Uses browser-use to autonomously navigate Poshmark and create listings.
Handles the complete listing flow including image upload, category selection,
and form submission.
"""

from typing import Dict, Any, Optional
import re
import structlog

from .base_agent import BaseMarketplaceAgent

logger = structlog.get_logger()


class PoshmarkListingAgent(BaseMarketplaceAgent):
    """
    Poshmark-specific listing automation agent.
    
    Poshmark Listing Flow:
    1. Navigate to create listing page
    2. Upload product images (up to 16)
    3. Fill in title (max 80 chars)
    4. Fill in description (max 1500 chars)
    5. Select department, category, subcategory
    6. Select size
    7. Add brand
    8. Set condition (NWT, NWOT, Good, Fair, Poor)
    9. Set price and original price
    10. Submit listing
    """
    
    MARKETPLACE_NAME = "poshmark"
    MARKETPLACE_URL = "https://poshmark.com"
    CREATE_LISTING_URL = "https://poshmark.com/create-listing"
    MAX_STEPS = 60  # Poshmark has many form fields
    TIMEOUT_SECONDS = 150
    
    # Poshmark-specific constants
    MAX_TITLE_LENGTH = 80
    MAX_DESCRIPTION_LENGTH = 1500
    MAX_IMAGES = 16
    
    def _build_task_prompt(self, listing: Dict[str, Any]) -> str:
        """
        Build Poshmark-specific task prompt for the agent.
        
        Poshmark requires specific formatting and has unique UI elements.
        """
        title = listing.get("poshmark_title", listing.get("title", ""))[:self.MAX_TITLE_LENGTH]
        description = listing.get("poshmark_description", listing.get("description", ""))[:self.MAX_DESCRIPTION_LENGTH]
        price = listing.get("price", 0)
        original_price = listing.get("original_price", price)
        category = listing.get("category", "")
        subcategory = listing.get("subcategory", "")
        brand = listing.get("brand", "")
        size = listing.get("size", "")
        condition = listing.get("condition", "Good")
        color = listing.get("color", "")
        images = listing.get("images", [])[:self.MAX_IMAGES]
        
        # Build image upload instructions
        image_instructions = ""
        if images:
            image_instructions = f"""
            - Click "Add Photos" or the photo upload area
            - Upload these images in order: {', '.join(images[:8])}
            - Wait for each image to finish uploading before adding the next
            """
        
        return f"""
        Create a listing on Poshmark with the following details:
        
        IMPORTANT: You must be logged in. If you see a login page, the session has expired.
        
        STEP 1 - Navigate:
        - Go to {self.CREATE_LISTING_URL}
        - Wait for the page to fully load
        
        STEP 2 - Upload Images:
        {image_instructions}
        
        STEP 3 - Fill Listing Details:
        - Title: "{title}"
        - Description: "{description}"
        
        STEP 4 - Select Category:
        - Department/Category: {category}
        - Subcategory: {subcategory if subcategory else "Select most appropriate"}
        
        STEP 5 - Additional Details:
        - Brand: "{brand if brand else 'Select or type brand'}"
        - Size: "{size if size else 'Select appropriate size'}"
        - Color: "{color if color else 'Select primary color'}"
        - Condition: "{condition}"
        
        STEP 6 - Set Pricing:
        - Listing Price: ${price}
        - Original Price: ${original_price}
        
        STEP 7 - Submit:
        - Review all fields are filled correctly
        - Click "List" or "Next" to publish
        - Wait for confirmation
        
        STEP 8 - Get URL:
        - After successful listing, copy the listing URL from the browser
        - The URL should be like: poshmark.com/listing/[listing-id]
        
        RETURN: The complete listing URL
        """
    
    def _extract_listing_url(self, history: Any) -> Optional[str]:
        """
        Extract the Poshmark listing URL from agent history.
        
        Poshmark URLs follow the pattern: poshmark.com/listing/[slug]-[id]
        """
        if not history:
            return None
        
        # Pattern for Poshmark listing URLs
        url_pattern = r'https?://(?:www\.)?poshmark\.com/listing/[a-zA-Z0-9\-]+'
        
        # Search through history for URLs
        history_str = str(history)
        matches = re.findall(url_pattern, history_str)
        
        if matches:
            # Return the last match (most likely the final listing URL)
            return matches[-1]
        
        return None


class PoshmarkBulkAgent(PoshmarkListingAgent):
    """
    Extended Poshmark agent for bulk listing operations.
    
    Handles multiple listings in a single session for efficiency.
    """
    
    async def create_bulk_listings(
        self,
        listings: list[Dict[str, Any]],
        session: Dict[str, Any],
        batch_size: int = 5
    ) -> list[Dict[str, Any]]:
        """
        Create multiple listings in batches.
        
        Args:
            listings: List of listing data
            session: User's marketplace session
            batch_size: Number of listings per batch (prevents rate limiting)
            
        Returns:
            List of results for each listing
        """
        results = []
        
        for i in range(0, len(listings), batch_size):
            batch = listings[i:i + batch_size]
            
            logger.info(
                "Processing batch",
                batch_number=i // batch_size + 1,
                batch_size=len(batch),
                total_listings=len(listings)
            )
            
            for listing in batch:
                result = await self.create_listing(listing, session)
                results.append(result)
                
                # Small delay between listings to avoid rate limiting
                if result.get("success"):
                    import asyncio
                    await asyncio.sleep(2)
        
        return results
