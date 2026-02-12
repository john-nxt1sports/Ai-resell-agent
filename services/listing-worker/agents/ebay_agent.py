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
    eBay-specific listing automation agent using browser-use.
    
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
    MAX_STEPS = 100  # eBay has complex multi-step process with many form fields
    TIMEOUT_SECONDS = 360  # 6 minutes — item specifics & category selection take time
    
    # eBay-specific constants
    MAX_TITLE_LENGTH = 80
    MAX_DESCRIPTION_LENGTH = 500000  # eBay allows long descriptions
    MAX_IMAGES = 24
    
    # eBay condition mapping
    CONDITION_MAP = {
        "new": "New with tags",
        "nwt": "New with tags",
        "nwot": "New without tags",
        "like_new": "New without tags",
        "good": "Pre-owned",
        "fair": "Pre-owned",
        "poor": "For parts or not working",
    }
    
    def __init__(self, mode: str = "cloud"):
        """Initialize eBay agent with mode (cloud or local)."""
        super().__init__(mode=mode)
    
    def _build_task_prompt(self, listing: Dict[str, Any]) -> str:
        """
        Build eBay-specific task prompt for browser-use agent.
        """
        title = listing.get("ebay_title", listing.get("title", ""))[:self.MAX_TITLE_LENGTH]
        description = listing.get("ebay_description", listing.get("description", ""))
        price = listing.get("price", 0)
        category = listing.get("category", "")
        subcategory = listing.get("subcategory", "")
        brand = listing.get("brand", "")
        size = listing.get("size", "")
        condition = listing.get("condition", "good")
        ebay_condition = self.CONDITION_MAP.get(condition.lower(), "Pre-owned")
        color = listing.get("color", "")
        images = listing.get("images", [])[:self.MAX_IMAGES]
        local_image_paths = listing.get("_local_image_paths", [])
        
        # Build image upload section — prefer local paths (downloaded from Supabase)
        image_section = ""
        if local_image_paths:
            image_list = "\n".join([f"  {i+1}. {path}" for i, path in enumerate(local_image_paths[:12])])
            image_section = f"""
STEP 3 - Upload Images:
- Click the "Add photos" button or the photo upload area
- Upload these image files ONE AT A TIME using the file upload input:
{image_list}
- For each image: click the upload area, then use upload_file action with the file path above
- Wait for each image to fully upload before uploading the next one
- The first image will be the main/cover photo
- If there's an image crop modal or photo editor, click "Apply", "Done", or "Save"
- Wait for all thumbnails to appear before proceeding
"""
        elif images:
            image_list = "\n".join([f"  {i+1}. {url}" for i, url in enumerate(images[:12])])
            image_section = f"""
STEP 3 - Upload Images:
- Click the "Add photos" button or the photo upload area
- Upload these image files in order:
{image_list}
- Wait for each image to fully upload (loading indicator disappears)
- If there's an image crop modal, click "Apply" or "Done"
"""
        else:
            image_section = """
STEP 3 - Images:
- Skip or note that images are required
"""

        return f"""You are automating an eBay listing creation. Follow these steps precisely.
Be patient with each step — wait for elements to load before clicking.

IMPORTANT PREREQUISITES:
- You should already be logged into eBay
- If you see a LOGIN FORM (email/password fields or "Sign in" button), STOP and report "Session expired - please reconnect"
- IMPORTANT: eBay pages can be slow to load. After navigating, ALWAYS wait at least 5 seconds before evaluating whether the page loaded correctly. If the page appears blank or shows "Loading...", wait 5 more seconds.
- Do NOT assume session expired just because the page is slow to load.

STEP 1 - Navigate to Create Listing (CRITICAL - you MUST do this first):
- Use the go_to_url action to navigate to: {self.CREATE_LISTING_URL}
- The browser starts on about:blank — you MUST actively navigate, do NOT just wait
- After navigation, wait 3-5 seconds for the page to fully load
- If prompted, choose "Create a listing" or "Sell an item"
- If eBay shows a "What are you selling?" search box, type: "{title}" and search
- If eBay shows a list of matching products, select the closest match or click "Continue without match" / "List as new product"

STEP 2 - Category Selection (IMPORTANT - eBay has a deep category tree):
- If eBay auto-selected a category from the search, verify it looks correct
- If you need to pick manually: click "Change category" or "Browse categories"
- Target category: {category if category else 'select the most appropriate category'}
- eBay uses a multi-level nested tree — click through each level:
  1. Click top-level category (e.g., "Clothing, Shoes & Accessories")
  2. Click subcategory (e.g., "Women's Shoes")
  3. Click specific type (e.g., "Boots")
- Wait for each level to load before clicking the next
{f'- Subcategory hint: {subcategory}' if subcategory else ''}

{image_section}

STEP 4 - Item Title:
- Find the title input field
- Triple-click to select ALL existing text, then type the new title (this ensures old text is replaced)
- Title: "{title}"
- Make sure the title field shows ONLY the text above — no duplicates

STEP 5 - Item Specifics (IMPORTANT - eBay requires many specifics):
- Brand: "{brand if brand else 'Unbranded'}"
- Size: "{size if size else 'One Size'}"
- Color: "{color if color else 'Brown'}" — If this color isn't available, pick ANY color from the dropdown (e.g., Black, Brown, Multicolor) and move on. Do NOT try to select "Does not apply" for color.
- Fill ALL required item specifics marked with asterisk (*) or "Required"
- For dropdown fields, select the closest matching option from what's VISIBLE
- For text fields, type the value and select from suggestions if available
- CRITICAL BAIL-OUT RULE: If you cannot find an exact match in a dropdown after 1-2 clicks, IMMEDIATELY select ANY reasonable option from the visible list and move on. Do NOT keep trying the same dropdown repeatedly. This is essential — eBay dropdowns often don't have "Does not apply" or "N/A" options.
- Scroll down ONCE to check for additional required specifics
- If a "Photo tips" or similar popup appears, click X to dismiss it

STEP 6 - Condition:
- Select condition: "{ebay_condition}"
- If a "Condition description" text area is ALREADY VISIBLE right next to the condition selector, type: "See photos for details"
- If you do NOT see a condition description field, SKIP IT — do NOT scroll or search for it. It is optional and many categories don't have it.

STEP 7 - Description:
- Find the description textarea or rich text editor
- If eBay shows an HTML editor, switch to plain text mode first
- Clear any pre-filled text, then enter description: "{description}"
- Do NOT add emojis or special Unicode characters

STEP 8 - Pricing:
- Select "Fixed price" (Buy It Now) — NOT auction
- Clear the price field completely, then enter: {price}
- Enable "Best Offer" if the option is visible (checkbox or toggle)
- If you don't see a Best Offer option, skip it

STEP 9 - Shipping:
- eBay shipping setup can vary. Follow what you see on screen:
- If you see a shipping section with options:
  1. Look for "Free shipping" toggle or checkbox — enable it if available
  2. OR select "Flat: same cost to all buyers" and set cost to $0.00
  3. For carrier/service, pick "USPS Ground Advantage" or "USPS Priority Mail" if prompted
  4. Set handling time to "1 business day" if the option appears
- If eBay shows a shipping "policy" dropdown, select the first/default option
- If asked about returns, select "30 day returns" or "No returns" — either is fine
- If a shipping modal/popup appears, fill the required fields and click "Save" or "Done"
- IMPORTANT: Do NOT spend more than 3 steps on shipping. If you're going in circles, accept the defaults and move on.

STEP 10 - Review & Submit:
- Scroll through the ENTIRE form ONE TIME to check for any red error messages or unfilled required fields (marked with *)
- Fix any errors you find, but do NOT re-scroll the whole form more than once
- Look for the "List it" or "Complete listing" button — it's usually at the bottom
- Click the button ONCE and wait up to 10 seconds for the confirmation page
- DO NOT click the button more than once

STEP 11 - Confirm Success:
- After clicking "List it", watch for these success signals:
  1. Page redirects to a confirmation page (URL changes to ebay.com/sh/lst or similar)
  2. You see text like "Your listing is live" or "Congratulations" or an item number
  3. The URL contains /itm/ followed by numbers (e.g., ebay.com/itm/123456789)
- If you see ANY of these, the listing was created successfully
- Copy the listing URL or item number and return it as your final answer

SUCCESS CRITERIA:
- Listing appears on eBay with correct title and price
- You have the final listing URL or item number

GLOBAL RULES (follow these at ALL times):
- NEVER spend more than 2 steps trying to find or fill any SINGLE optional field
- If you can't find a field after 2 attempts, SKIP IT and move to the next step
- If you notice you're clicking the same thing repeatedly, STOP and move on
- Required fields are marked with * or "Required" — everything else is optional
- If a modal/popup appears (promotions, shipping discounts, feature suggestions), dismiss it — click "No thanks", "Skip", "X", or "Maybe later"
- If captcha appears, report "CAPTCHA detected"
- If rate limited, report "Rate limit reached"
- If an item specific is required but you don't have the data, select "Does not apply" or the most reasonable default
- PRIORITIZE completing the listing over filling every optional field perfectly
"""
    
    def _extract_listing_url(self, history: Any) -> Optional[str]:
        """
        Extract the eBay listing URL from browser-use agent history.
        
        eBay URLs follow the pattern: ebay.com/itm/[item-number]
        """
        if not history:
            return None
        
        # Pattern for eBay listing URLs
        url_pattern = r'https?://(?:www\.)?ebay\.com/itm/\d+'
        
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
            valid_matches = [m for m in matches if '/sl/' not in m and '/sell' not in m]
            if valid_matches:
                return valid_matches[-1]
            return matches[-1]
        
        # Try to extract from history actions
        if hasattr(history, 'history'):
            for action in history.history:
                if hasattr(action, 'result') and action.result:
                    result_matches = re.findall(url_pattern, str(action.result))
                    if result_matches:
                        valid = [m for m in result_matches if '/sl/' not in m]
                        if valid:
                            return valid[-1]
        
        return None


class EbayDraftAgent(EbayListingAgent):
    """
    Extended eBay agent that creates draft listings for review.
    """
    
    def _build_task_prompt(self, listing: Dict[str, Any]) -> str:
        """Build prompt that saves as draft instead of publishing."""
        base_prompt = super()._build_task_prompt(listing)
        
        return base_prompt.replace(
            'Click to publish the listing',
            'Click "Save as draft" instead of publishing'
        ).replace(
            'Return this URL as your final answer',
            'Confirm that draft was saved successfully'
        )
