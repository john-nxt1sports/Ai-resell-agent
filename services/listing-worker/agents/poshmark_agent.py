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
    Poshmark-specific listing automation agent using browser-use.
    
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
    MAX_STEPS = 100  # Poshmark has many form fields + nested categories
    TIMEOUT_SECONDS = 360  # 6 minutes — category selection & image uploads take time
    
    # Poshmark-specific constants
    MAX_TITLE_LENGTH = 80
    MAX_DESCRIPTION_LENGTH = 1500
    MAX_IMAGES = 16
    
    # Poshmark condition mapping
    CONDITION_MAP = {
        "new": "NWT",
        "like_new": "NWOT",
        "good": "Good",
        "fair": "Fair",
        "poor": "Poor",
    }
    
    def __init__(self, mode: str = "cloud"):
        """Initialize Poshmark agent with mode (cloud or local)."""
        super().__init__(mode=mode)
    
    def _build_task_prompt(self, listing: Dict[str, Any]) -> str:
        """
        Build Poshmark-specific task prompt for browser-use agent.
        
        This prompt guides the AI to fill out Poshmark's listing form correctly.
        """
        title = listing.get("poshmark_title", listing.get("title", ""))[:self.MAX_TITLE_LENGTH]
        raw_desc = listing.get("poshmark_description", listing.get("description", ""))[:self.MAX_DESCRIPTION_LENGTH]
        # Ensure literal \n sequences are real newlines before passing to browser
        description = raw_desc.replace("\\n", "\n")
        price = listing.get("price", 0)
        original_price = listing.get("original_price", price) or price
        category = listing.get("category", "")
        subcategory = listing.get("subcategory", "")
        brand = listing.get("brand", "")
        size = listing.get("size", "")
        condition = self.CONDITION_MAP.get(listing.get("condition", "").lower(), "Good")
        color = listing.get("color", "")
        images = listing.get("images", [])[:self.MAX_IMAGES]
        local_image_paths = listing.get("_local_image_paths", [])
        
        # Build tags list from hashtags & keywords
        hashtags = listing.get("poshmark_hashtags", [])
        keywords = listing.get("keywords", [])
        # Extract clean tag words (remove # prefix if present)
        style_tags = []
        for tag in hashtags + keywords:
            clean = tag.lstrip("#").strip()
            if clean and clean not in style_tags:
                style_tags.append(clean)
        style_tags = style_tags[:10]  # Poshmark allows up to 10 style tags
        
        # Build detailed image upload instructions
        image_section = ""
        if local_image_paths:
            # Use local file paths (downloaded from Supabase URLs)
            image_list = "\n".join([f"  {i+1}. {path}" for i, path in enumerate(local_image_paths[:8])])
            image_section = f"""
STEP 2 - Upload Images:
- Click the "Add Photos" button or the photo upload area (usually shows camera icon)
- Upload these image files ONE AT A TIME using the file upload input:
{image_list}
- For each image: click the upload area, then use upload_file action with the file path above
- Wait for each image to fully upload before uploading the next one
- If there's an image crop modal, click "Apply" or "Done"
"""
        elif images:
            # Fallback: URLs only (may not work with upload_file)
            image_list = "\n".join([f"  {i+1}. {url}" for i, url in enumerate(images[:8])])
            image_section = f"""
STEP 2 - Upload Images:
- Click the "Add Photos" button or the photo upload area (usually shows camera icon)
- Upload these image files in order:
{image_list}
- Wait for each image to fully upload (loading indicator disappears)
- If there's an image crop modal, click "Apply" or "Done"
"""
        else:
            image_section = """
STEP 2 - Images:
- Skip image upload (none provided) or note that images are required
"""

        return f"""You are automating a Poshmark listing creation. Follow these steps precisely.
Be patient with each step — wait for elements to load before clicking.

IMPORTANT PREREQUISITES:
- You should already be logged into Poshmark
- If you see a LOGIN FORM (email/password fields or "Log In" button), STOP and report "Session expired - please reconnect"
- Pages may be slow to load. After navigating, ALWAYS wait at least 5 seconds before evaluating. Do NOT assume session expired just because the page is slow.

STEP 1 - Navigate to Create Listing (CRITICAL - you MUST do this first):
- Use the go_to_url action to navigate to: {self.CREATE_LISTING_URL}
- The browser starts on about:blank — you MUST actively navigate, do NOT just wait
- After navigation, wait 3-5 seconds for the page to fully load
- If redirected to login, report session expired

{image_section}

STEP 3 - Fill Basic Details:
- Find the title input field
- Enter title: "{title}"
- Find the description textarea
- Enter description: "{description}"

STEP 4 - Select Category (MUST SELECT FROM DROPDOWN, NOT TYPE):
- Click on the "Select Category" dropdown/button to open the category panel
- Poshmark uses a nested category tree. You MUST click through multiple levels one at a time.
- DO NOT type category names into the field — you must CLICK to open the dropdown and CLICK on options from the visible list
- Target category path: {category if category else 'select the most appropriate category for this item'}
- LEVEL 1: Click the TOP-LEVEL department (e.g., "Women", "Men", "Kids")
  - WAIT 1-2 seconds for subcategories to load
- LEVEL 2: Click the CATEGORY from the visible list (e.g., "Shoes", "Tops", "Dresses")
  - WAIT 1-2 seconds for the next level to load
- LEVEL 3: Click the SUBCATEGORY from the visible list if available (e.g., "Ankle Boots & Booties", "Athletic Shoes")
- IMPORTANT: After clicking each level, WAIT for the next level to appear before clicking
- The category selector should close after selecting the final/deepest level
- If it doesn't close automatically, look for an "Apply", "Done", or checkmark button and click it
- VERIFY the category field shows the selected category path before moving on
{f'- Subcategory hint: {subcategory}' if subcategory else ''}

STEP 5 - Select Size:
- After category is selected, a size selector should appear
- Click the size dropdown and select "{size if size else 'M'}" or the closest available
- If size chart appears, select from the appropriate chart

STEP 6 - Fill Additional Details:
- Brand: Click brand input, type "{brand if brand else 'Other'}", WAIT 2-3 seconds for autocomplete dropdown to appear below the input. You will see options like "{brand if brand else 'Other'}" or "{brand if brand else 'Other'} (Custom)". You MUST CLICK on one of these dropdown options — if you don't click an option, the brand will be ERASED when you click elsewhere. Click "{brand if brand else 'Other'} (Custom)" if no exact match exists.
- Color: Select "{color if color else 'Black'}" from color options if available
- Condition: Select "{condition}"

STEP 7 - Add Style Tags (IMPORTANT - Poshmark has a SEPARATE tags section):
- Look for a "Style Tags" section on the listing form — it is SEPARATE from the description and SKU fields
- The Style Tags input is usually located BELOW the Color/Condition section
- Click the Style Tags input field — NOT the SKU or any other field
- Enter tags ONE AT A TIME (do NOT type them comma-separated):
{chr(10).join(f'  - Type "{tag}" then press Enter — wait for it to appear as a pill/chip' for tag in style_tags) if style_tags else '  - Skip if no tags available'}
- Add up to 10 style tags total
- VERIFY each tag appears as a separate pill/chip before typing the next one
- If you cannot find the Style Tags field, skip this step and continue

STEP 8 - Set Pricing:
- Find "Listing Price" input, clear it, enter: {price}
- Find "Original Price" input, clear it, enter: {original_price}

STEP 9 - Submit Listing:
- Scroll down to find the "Next" button and click it
- If there's a second page for shipping or other details, fill required fields and continue
- Click "List" or "List This Item" to submit the listing
- CRITICAL: After clicking "List This Item", WAIT 5 seconds for the page to process
- After submission, the page will redirect to the live listing URL
- The URL in the browser address bar will change to: https://poshmark.com/listing/[item-name]-[id]
- If you see a confirmation page, congratulations page, share prompt, or the listing detail page, the listing was SUCCESSFULLY CREATED
- DO NOT click "List This Item" again if the page changed — it already worked!

STEP 10 - Capture Result:
- Read the current URL from the browser address bar
- The listing URL should look like: https://poshmark.com/listing/[item-name]-[id]
- This is the final listing URL — return it as the result
- If you see a share/promote popup, ignore it — the listing is already live

SUCCESS CRITERIA (if ANY of these are true, the listing was CREATED SUCCESSFULLY):
- The browser URL contains "/listing/" (not "/create-listing")
- You see a confirmation or "congratulations" message
- You see the listing detail page with the product images
- You see a share prompt or social sharing buttons
- The page title changed to show the product name

ERROR HANDLING:
- If any required field shows an error, fill it and retry
- If a modal/popup appears, dismiss it or click through it
- If category selection seems stuck, try scrolling within the category panel
- If captcha appears, report "CAPTCHA detected"
- If rate limited, report "Rate limit reached"
"""
    
    def _extract_listing_url(self, history: Any) -> Optional[str]:
        """
        Extract the Poshmark listing URL from browser-use agent history.
        
        Poshmark URLs follow the pattern: poshmark.com/listing/[slug]-[id]
        """
        if not history:
            return None
        
        # Pattern for Poshmark listing URLs
        url_pattern = r'https?://(?:www\.)?poshmark\.com/listing/[a-zA-Z0-9\-_]+'
        
        # Try to get from final result first
        if hasattr(history, 'final_result'):
            final = history.final_result()
            if final:
                matches = re.findall(url_pattern, str(final))
                if matches:
                    return matches[-1]
        
        # Search through entire history
        history_str = str(history)
        matches = re.findall(url_pattern, history_str)
        
        if matches:
            # Return the last match (most likely the final listing URL)
            # Filter out any create-listing URLs
            valid_matches = [m for m in matches if '/create-listing' not in m]
            if valid_matches:
                return valid_matches[-1]
            return matches[-1]
        
        # Try to extract from URLs visited
        if hasattr(history, 'history'):
            for action in history.history:
                if hasattr(action, 'result') and action.result:
                    result_matches = re.findall(url_pattern, str(action.result))
                    if result_matches:
                        valid = [m for m in result_matches if '/create-listing' not in m]
                        if valid:
                            return valid[-1]
        
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
