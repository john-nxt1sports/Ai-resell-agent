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
    Mercari-specific listing automation agent using browser-use.
    
    Mercari Listing Flow:
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
    MAX_STEPS = 100  # Generous steps — category selection & form can be involved
    TIMEOUT_SECONDS = 360  # 6 minutes — matching Poshmark/eBay for consistency
    
    # Mercari-specific constants
    MAX_TITLE_LENGTH = 80
    MAX_DESCRIPTION_LENGTH = 1000
    MAX_IMAGES = 12
    MIN_PRICE = 1
    MAX_PRICE = 2000
    
    # Mercari condition mapping
    CONDITION_MAP = {
        "new": "New",
        "nwt": "New",
        "nwot": "Like New",
        "like_new": "Like New",
        "like new": "Like New",
        "excellent": "Good",
        "good": "Good",
        "fair": "Fair",
        "poor": "Poor",
    }
    
    def __init__(self, mode: str = "cloud"):
        """Initialize Mercari agent with mode (cloud or local)."""
        super().__init__(mode=mode)
    
    def _build_task_prompt(self, listing: Dict[str, Any]) -> str:
        """
        Build Mercari-specific task prompt for browser-use agent.
        """
        title = listing.get("mercari_title", listing.get("title", ""))[:self.MAX_TITLE_LENGTH]
        description = listing.get("mercari_description", listing.get("description", ""))[:self.MAX_DESCRIPTION_LENGTH]
        price = max(self.MIN_PRICE, min(listing.get("price", 0), self.MAX_PRICE))
        category = listing.get("category", "")
        subcategory = listing.get("subcategory", "")
        brand = listing.get("brand", "")
        condition = listing.get("condition", "good")
        mercari_condition = self.CONDITION_MAP.get(condition.lower(), "Good")
        color = listing.get("color", "")
        size = listing.get("size", "")
        images = listing.get("images", [])[:self.MAX_IMAGES]
        local_image_paths = listing.get("_local_image_paths", [])
        
        # Build image upload section — prefer local paths (downloaded from Supabase)
        image_section = ""
        if local_image_paths:
            image_list = "\n".join([f"  {i+1}. {path}" for i, path in enumerate(local_image_paths)])
            image_section = f"""
STEP 2 - Upload Photos:
- Click the "Add photos" button, camera icon, or photo upload area
- Upload these image files ONE AT A TIME using the file upload input:
{image_list}
- For each image: click the upload area, then use upload_file action with the file path above
- Wait for each image to fully upload before uploading the next one
- The first image will be the cover photo
- If there's an image crop modal or photo editor, click "Apply", "Done", or "Save"
- Wait for all thumbnails to appear before proceeding
"""
        elif images:
            image_list = "\n".join([f"  {i+1}. {url}" for i, url in enumerate(images)])
            image_section = f"""
STEP 2 - Upload Photos:
- Click the "Add photos" button or photo upload area
- Upload these images in order:
{image_list}
- Wait for each upload to complete (loading indicator disappears)
- If there's an image crop modal, click "Apply" or "Done"
"""
        else:
            image_section = """
STEP 2 - Photos:
- Skip or note that photos are required
"""

        return f"""You are automating a Mercari listing creation. Follow these steps precisely.
Be patient with each step — wait for elements to load before clicking.

IMPORTANT PREREQUISITES:
- You should already be logged into Mercari
- If you see a LOGIN FORM (email/password fields or "Sign in" button), STOP and report "Session expired - please reconnect"
- IMPORTANT: Mercari is a slow-loading React app. After navigating, ALWAYS wait at least 5 seconds, then check if the form is visible. If the page shows "Processing..." or is blank, wait 5 more seconds and try scrolling down — the content may be loading below.
- Do NOT assume session expired just because the page is slow to load.

STEP 1 - Navigate to Create Listing (CRITICAL - you MUST do this first):
- Use the go_to_url action to navigate to: {self.CREATE_LISTING_URL}
- The browser starts on about:blank — you MUST actively navigate, do NOT just wait
- After navigation, wait 3-5 seconds for the page to fully load
- If redirected to login, report session expired
- If Mercari shows a pop-up or promotional modal, dismiss it

{image_section}

STEP 3 - Title:
- Find the title input field (usually labeled "What are you selling?" or "Title")
- Click on the title input field first
- CLEAR the field completely before typing (use clear: True or select all + delete)
- Enter title: "{title}"
- Make sure ONLY the title text appears — do not type anything else in this field

STEP 4 - Description:
- Find the description textarea (separate field below the title)
- Click on the description textarea
- Enter description: "{description}"

STEP 5 - Category (IMPORTANT - Mercari uses a multi-level category picker):
- Click "Select category" or the category dropdown/button
- Mercari uses a nested category tree similar to other marketplaces
- Target category: {category if category else 'select the most appropriate category for this item'}
- Click through each level:
  1. Click top-level category (e.g., "Women", "Men", "Electronics")
  2. Click subcategory (e.g., "Shoes", "Tops", "Phones")
  3. Click specific type if available (e.g., "Boots", "T-Shirts")
- Wait for each level to load before clicking the next
- After selecting the final category, the picker should close
{f'- Subcategory hint: {subcategory}' if subcategory else ''}

STEP 6 - Item Details:
- Condition: Click the "{mercari_condition}" card/button to select it
- Brand: Click brand field, type "{brand if brand else 'No Brand'}", select from dropdown if suggestions appear, otherwise press Enter
- Color: "{color if color else 'Not specified'}" (select from color options if the field is available)

- SIZE (IMPORTANT - this is a required dropdown):
  * Click the "Select size" dropdown button (it has id=itemSizeId)
  * A dropdown list will appear with size options
  * For shoes: sizes look like "US 5", "US 5.5", "US 6", "US 6.5", etc.
  * For clothing: sizes look like "XS", "S", "M", "L", "XL", etc.
  * Target size: "{size if size else 'M'}"
  * If the size is a number (e.g. "8"), look for "US {size}" in the dropdown for shoes
  * Click the matching size option in the dropdown list
  * If NO exact match exists, click the CLOSEST available size
  * DO NOT click the "Size" header/label — click an actual size VALUE in the dropdown list
  * DO NOT keep scrolling endlessly — if you've scrolled through the whole list and can't find the size, pick the closest one visible
  * If you get stuck for more than 3 attempts, just click ANY reasonable size and move on
  * The dropdown must show a selected size (not "Select size") before proceeding

- Fill any other required fields that appear for this category

STEP 7 - Price:
- Find the price input field
- Clear any existing value
- Enter price: {price}
- Mercari shows fee breakdown and your earnings — just verify price is entered correctly
- Note: Mercari price must be between ${self.MIN_PRICE} and ${self.MAX_PRICE}

STEP 8 - Shipping (IMPORTANT - this has a multi-step modal flow):
- First, click the "Prepaid label" button to select Mercari's prepaid shipping
- "Offer buyers free shipping?": select "No"
- Next you MUST select a shipping carrier. Click the "Shipping label" area/button
  (it may say "Add title and category to enable shipping" — if so, make sure title and category are filled first)
- A MODAL will appear — this is the shipping carrier selection modal:
  * The modal title says "Select Shipping"
  * It may show a "Got it" button first (informational) — click it
  * It may show a "Next" button — click it to see carrier options
  * You will see carrier options like "USPS", "UPS Ground Saver", "FedEx" with weight tiers and prices
  * Click the most appropriate carrier option (e.g. "UPS Ground Saver" for shoes/boots, or the cheapest option)
  * After selecting a carrier, click "Save" to confirm
- The modal should close and the shipping section should now show your selected carrier
- If the shipping section still says "Add title and category..." or "Please select a shipping carrier", the selection did NOT work — try again
- You CANNOT publish without a valid shipping carrier selected

STEP 9 - Review & Publish (CRITICAL - check EVERYTHING before clicking List):
- Scroll through the ENTIRE form from top to bottom
- Check that ALL of these are filled:
  * Photos uploaded (thumbnails visible)
  * Title filled in
  * Description filled in
  * Category selected (not "Select category")
  * Condition selected
  * Brand filled in
  * Size selected (not "Select size")
  * Price entered
  * Shipping carrier selected (not "Add title and category...")
- Check for ANY red error messages like "Size can not be empty" or "Please select a shipping carrier"
- If you see ANY red error text, FIX that field FIRST before trying to publish
- Only after ALL errors are resolved, click the "List" button
- Wait for the page to process (you may see "Saving..." text)
- DO NOT click List more than once — wait at least 10 seconds
- If clicking "List" shows new errors, fix them and click "List" again

STEP 10 - Capture Result:
- After clicking List, Mercari may show "Saving..." then redirect
- If the page redirects to a new URL or shows a confirmation, the listing was posted successfully
- If you see a 404 page or get redirected back to /sell, the listing may have still been posted — report success
- Check the browser URL — if it contains "/item/m" that's the listing URL
- If you can't find a listing URL but the form is no longer visible (you were redirected), report success with message "Listing posted successfully"
- Return the listing URL if found, otherwise report success

SUCCESS CRITERIA:
- Listing form was fully filled and "List" button was clicked
- Page showed "Saving..." or redirected after clicking List
- No remaining red error messages were visible when List was clicked

ERROR HANDLING:
- If any field shows an error, fill it correctly and retry
- If a modal/popup appears (promotions, shipping tips, etc.), dismiss it by clicking "Got it", "Close", "Next", or the X button
- If category selection seems stuck, try scrolling within the category panel
- If the shipping modal keeps reappearing, click through it: Got it -> Next -> select carrier -> Save
- If captcha appears, report "CAPTCHA detected"
- If rate limited, report "Rate limit reached"
- If a required field doesn't have a matching option, pick the closest one
"""
    
    def _extract_listing_url(self, history: Any) -> Optional[str]:
        """
        Extract the Mercari listing URL from browser-use agent history.
        
        Mercari URLs follow the pattern: mercari.com/item/m[numbers]
        or mercari.com/us/item/m[numbers]
        """
        if not history:
            return None
        
        # Pattern for Mercari item URLs
        url_pattern = r'https?://(?:www\.)?mercari\.com(?:/us)?/item/m\d+'
        
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
            # Filter out any sell/create URLs
            valid_matches = [m for m in matches if '/sell' not in m]
            if valid_matches:
                return valid_matches[-1]
            return matches[-1]
        
        # Try to extract from history actions
        if hasattr(history, 'history'):
            for action in history.history:
                if hasattr(action, 'result') and action.result:
                    result_matches = re.findall(url_pattern, str(action.result))
                    if result_matches:
                        valid = [m for m in result_matches if '/sell' not in m]
                        if valid:
                            return valid[-1]
        
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
