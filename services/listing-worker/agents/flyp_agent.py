"""
Flyp Crosslister Agent - Creates items on Flyp (tools.joinflyp.com) (2026 Best Practices)

Uses browser-use to autonomously navigate Flyp's crosslisting platform
and create items across all connected marketplaces (Poshmark, eBay, Mercari).

Flyp is a crosslisting tool — items are SAVED (not listed) so the user can
review before publishing to individual marketplaces.

Flyp UI Flow (verified Feb 2026):
  1. Navigate to tools.joinflyp.com/item/new
  2. Fill the "Universal form" (left tab, selected by default)
     - Upload images (16 max)
     - Title* (255 chars), Description* (1000 chars)
     - Brand, Condition, Primary Color, Secondary Color (dropdowns)
     - SKU, Zip Code, Tags (text)
     - Quantity* (default 1)
     - Note to self (500 chars)
     - Package weight* (lb / oz)
     - Package Dimensions (in x in x in)
     - Listing Price* ($), Cost of Goods ($)
  3. Click "Save" button at the bottom
  4. Click each marketplace tab in left sidebar (Poshmark, Mercari, eBay)
     - Each tab shows "X fields left" for marketplace-specific fields
     - Fill remaining required fields (category, size, etc.)
     - Save each marketplace form
"""

from typing import Dict, Any, Optional, List
import re
import structlog

from .base_agent import BaseMarketplaceAgent, AgentResult

logger = structlog.get_logger()


class FlypCrosslisterAgent(BaseMarketplaceAgent):
    """
    Flyp-specific crosslisting agent using browser-use.

    Flyp is a reseller crosslisting platform at tools.joinflyp.com.
    It has a "Universal form" that auto-populates shared fields across
    all connected marketplaces (Poshmark, Mercari, eBay, Depop, Etsy, Facebook).

    After saving the universal form, each marketplace tab in the left sidebar
    shows remaining marketplace-specific fields (category, size, shipping, etc.)
    that need to be filled separately.

    KEY BEHAVIOR:
    - Items are SAVED (not listed) — the user reviews and lists manually.
    - Universal form auto-fills shared data to all marketplace-specific forms.
    - Marketplace tabs show "X fields left" indicating required per-platform fields.
    """

    MARKETPLACE_NAME = "flyp"
    MARKETPLACE_URL = "https://tools.joinflyp.com"
    CREATE_LISTING_URL = "https://tools.joinflyp.com/item/new"
    MAX_STEPS = 100  # Reduced for speed - universal + 3 marketplace tabs
    TIMEOUT_SECONDS = 300  # 5 minutes — optimized for faster execution

    # Flyp Universal form limits
    MAX_TITLE_LENGTH = 255
    MAX_DESCRIPTION_LENGTH = 1000
    MAX_IMAGES = 16
    MAX_NOTE_LENGTH = 500

    # Flyp condition dropdown options
    CONDITION_MAP = {
        "new": "New with Tags",
        "nwt": "New with Tags",
        "nwot": "New without Tags",
        "like_new": "New without Tags",
        "good": "Good",
        "fair": "Fair",
        "poor": "Poor",
    }

    # Marketplaces available as tabs in Flyp's left sidebar
    SUPPORTED_MARKETPLACES = ["poshmark", "mercari", "ebay"]

    def __init__(self, mode: str = "cloud"):
        """Initialize Flyp agent with mode (cloud or local)."""
        super().__init__(mode=mode)

    def _build_task_prompt(self, listing: Dict[str, Any]) -> str:
        """
        Build Flyp-specific task prompt for browser-use agent.

        Matches the verified Flyp UI at tools.joinflyp.com/item/new (Feb 2026):
        - Universal form with shared fields → Save
        - Then per-marketplace tabs for platform-specific fields → Save each
        """
        title = listing.get("title", "")[:self.MAX_TITLE_LENGTH]
        raw_desc = listing.get("description", "")[:self.MAX_DESCRIPTION_LENGTH]
        description = raw_desc.replace("\\n", "\n")
        price = listing.get("price", 0)
        original_price = listing.get("original_price", "")
        cost_of_goods = listing.get("cost_of_goods", "")
        brand = listing.get("brand", "")
        size = listing.get("size", "")
        condition_raw = listing.get("condition", "").lower()
        condition = self.CONDITION_MAP.get(condition_raw, "Good")
        color = listing.get("color", "")
        secondary_color = listing.get("secondary_color", "")
        category = listing.get("category", "")
        subcategory = listing.get("subcategory", "")
        sku = listing.get("sku", "")
        tags = listing.get("tags", [])
        weight_lb = listing.get("weight_lb", "")
        weight_oz = listing.get("weight_oz", "")
        images = listing.get("images", [])[:self.MAX_IMAGES]
        local_image_paths = listing.get("_local_image_paths", [])

        # Build image upload instructions
        image_section = self._build_image_section(local_image_paths, images)

        # Build tags string — generate from listing data if none provided
        if isinstance(tags, list) and tags:
            tags_str = ", ".join(tags)
        else:
            # Auto-generate tags from listing data for better SEO
            auto_tags = []
            if brand:
                auto_tags.append(brand.lower())
            if category:
                auto_tags.append(category.lower())
            if color:
                auto_tags.append(color.lower())
            if size:
                auto_tags.append(f"size {size}".lower())
            # Add generic reseller tags
            auto_tags.extend(["womens fashion", "designer", "trendy", "style"])
            tags_str = ", ".join(auto_tags[:8])

        # Determine weight — default to reasonable estimate
        if weight_lb or weight_oz:
            weight_instructions = f"Enter \"{weight_lb or 0}\" in the lb field and \"{weight_oz or 0}\" in the oz field"
        else:
            weight_instructions = 'Enter "1" in the lb field and "0" in the oz field (safe default for clothing)'

        # Build marketplace-specific tab instructions
        marketplace_tabs_section = self._build_marketplace_tabs_section(
            listing, category, subcategory, size
        )

        return f"""You are automating item creation on Flyp (tools.joinflyp.com), a reseller crosslisting platform.
Follow EVERY step below precisely. DO NOT skip any field. Wait for each element to load before interacting.

CRITICAL RULES:
- You MUST fill EVERY field listed below — do NOT skip Brand, Color, Tags, Weight, etc.
- After saving the Universal form, you MUST stay on the same page and click EACH marketplace
  tab in the LEFT SIDEBAR (Poshmark, Mercari, eBay) to fill their specific fields and Save each one.
- Do NOT navigate away from the item page after saving the Universal form.
- Do NOT start creating a new item. You work on ONE item only.
- Only click "Save" button — NEVER "List" or "Publish".
- If you see a LOGIN FORM, STOP and report "Session expired - please reconnect to Flyp"

═══════════════════════════════════════════════════
  PHASE 1: UNIVERSAL FORM
═══════════════════════════════════════════════════

STEP 1 — Navigate to the Create Item page:
- go_to_url: {self.CREATE_LISTING_URL}
- Wait for page to load (proceed as soon as form is visible)
- You should see "Universal form" heading
- If redirected to login, STOP and report "Session expired"

{image_section}

STEP 3 — Fill Title (REQUIRED, 255 chars max):
- Find the input labeled "Title*"
- Click it, clear any existing text, type exactly:
  {title}

STEP 4 — Fill Description (REQUIRED, 1000 chars max):
- Find the textarea labeled "Description*"
- Click it, clear any existing text, type exactly:
  {description}

STEP 5 — Fill Brand (CRITICAL — MUST CLICK DROPDOWN):
- Find "Brand" input, click it, type "{brand}"
- Wait for dropdown to appear (usually instant), then CLICK the matching option
- If you see "{brand} (Custom)" — click it
- Verify brand shows as selected before moving on

STEP 6 — Fill Condition (DO NOT SKIP):
- Find the "Condition" dropdown (labeled "Condition (Optional)")
- Click it to open the dropdown
- Select "{condition}" from the list
- Options are: New with Tags, New without Tags, Good, Fair, Poor
- VERIFY the condition shows "{condition}" before moving on

STEP 7 — Fill Primary Color (USE KEYBOARD TO SEARCH):
- Find the "Primary Color" dropdown (labeled "Primary Color (Optional)")
- Click it ONCE to open the dropdown
- IMPORTANT: The dropdown is a SEARCHABLE/FILTERABLE list — DO NOT scroll!
- Immediately after clicking to open, TYPE the color name "{color if color else 'Black'}" using keyboard
- The dropdown will FILTER to show matching colors as you type
- Once you see "{color if color else 'Black'}" (or closest match) appear, click it OR press Enter to select
- If the dropdown closes without selecting, click it again and retype the color
- FALLBACK: If after 2 attempts you cannot select the color, SKIP this field and move on — it is OPTIONAL
- VERIFY a color is selected (shows in the field) before moving on. If not selected after 2 tries, proceed anyway.
{f'''
STEP 7b — Fill Secondary Color (USE KEYBOARD TO SEARCH):
- Find the "Secondary Color" dropdown  
- Click it ONCE to open, then TYPE "{secondary_color}" to filter
- Click the matching option or press Enter
- If it fails after 2 attempts, SKIP — this field is optional''' if secondary_color else ''}

STEP 8 — Fill SKU and Zip Code:
{f'- SKU field: Click it, type "{sku}"' if sku else '- SKU field: Leave empty (optional)'}
- Zip Code: Should already be pre-filled. Leave as-is unless it's empty.
  If empty, enter "44720"

STEP 9 — Fill Tags (DO NOT SKIP — ENTER ONE AT A TIME):
- IMPORTANT: The Tags field is SEPARATE from and BELOW the SKU field. Do NOT type tags into the SKU field.
- Find the "Tags" input field — it is labeled "Tags (Optional)" and is located AFTER/BELOW the SKU and Zip Code fields
- Click specifically on the Tags input field (NOT the SKU field)
- You must enter tags ONE AT A TIME — do NOT type them comma-separated
- For each tag:
  1. Type a single tag word (e.g. "{tags_str.split(', ')[0] if tags_str else 'fashion'}")
  2. Press Enter to confirm — it should appear as a pill/chip
  3. Then type the next tag and press Enter again
- Enter these tags one by one:
{chr(10).join(f'  - Type "{tag.strip()}" then press Enter' for tag in tags_str.split(',')[:8])}
- VERIFY each tag appears as a separate pill/chip in the Tags field before moving on

STEP 10 — Fill Quantity:
- Quantity field should show "1" by default
- Leave as "1" unless listing specifies otherwise

STEP 11 — Fill Note to self:
- Leave the "Note to self" field empty

STEP 12 — Fill Package Weight (REQUIRED — form will NOT save without this):
- Scroll down to find "Package Weight*"
- {weight_instructions}
- This field is REQUIRED. The Save button will fail if weight is empty.

STEP 13 — Fill Package Dimensions (Optional):
- Leave the three dimension fields (in × in × in) empty unless specified

STEP 14 — Fill Listing Price (REQUIRED):
- Find the "Listing Price*" field (has a "$" prefix)
- Click it, clear it, type: {price}
{f'''
STEP 14b — Fill Cost of Goods:
- Find "Cost of Goods" field
- Click it, type: {cost_of_goods}''' if cost_of_goods else ''}

STEP 15 — SAVE the Universal Form:
- Scroll to bottom, click the blue "Save" button
- Wait for URL to change from /item/new to /item/[id] (indicates save complete)
- DO NOT navigate away — stay on this page for marketplace tabs

═══════════════════════════════════════════════════
  PHASE 2: MARKETPLACE-SPECIFIC TABS (SAME PAGE — NO NAVIGATION)
═══════════════════════════════════════════════════

IMPORTANT: After saving the Universal form, you are STILL on the same item page.
The LEFT SIDEBAR on the page shows clickable tabs: "Universal form", "Poshmark", "Mercari", "eBay", etc.
These are UI TABS on the current page — NOT separate pages to navigate to.

You MUST:
- CLICK the tab labels in the LEFT SIDEBAR to switch between marketplace forms
- The right side of the page will update to show that marketplace's form fields
- Stay on the SAME URL the entire time (tools.joinflyp.com/item/[item-id])

DO NOT:
- Use go_to_url or navigate() to any URL — NO NAVIGATION AT ALL
- Navigate to poshmark.com, mercari.com, ebay.com, or any other URL
- Navigate to /item/new again
- Click "Back to my items"
- Leave the current page
- The URL in the address bar should NOT change during Phase 2

{marketplace_tabs_section}

═══════════════════════════════════════════════════
  FINAL RESULT
═══════════════════════════════════════════════════

After completing ALL marketplace tabs:
- Note the current URL (should be tools.joinflyp.com/item/[item-id])
- Report: "Item saved successfully on Flyp. All marketplace forms completed."
- Include the item URL

SUCCESS CRITERIA:
- Universal form saved (URL changed from /item/new to /item/[id])
- Each marketplace tab was clicked, fields filled, and saved
- All marketplace tabs show "0 fields left" or reduced field count

ERROR HANDLING:
- If a required field shows red error → fill it and retry Save
- If a dropdown doesn't have the exact option → pick the closest match
- If a marketplace tab says "Not connected" → skip it entirely
- If stuck on a field for 2+ attempts → skip that field, try to Save anyway
- NEVER click "List" or "Publish" — ONLY "Save"
"""

    def _build_image_section(
        self, local_image_paths: List[str], images: List[str]
    ) -> str:
        """Build the image upload instructions for Flyp's Universal form."""
        if local_image_paths:
            image_list = "\n".join(
                [f"  {i+1}. {path}" for i, path in enumerate(local_image_paths[:self.MAX_IMAGES])]
            )
            return f"""
STEP 2 - Upload Images (16 max):
- Click the "+ Upload Images" area at the top of the form (shows "16 max - bulk link")
- Upload these image files ONE AT A TIME using the file upload input:
{image_list}
- For each image: click the upload area, use upload_file action with the file path
- IMPORTANT: After each file upload, if a macOS Finder/file dialog window appears or stays open,
  press Escape to dismiss it. The file dialog MUST be closed before continuing.
- Wait for each image to fully upload (thumbnail appears) before uploading the next
- If there's an image crop/edit modal, click "Apply" or "Done"
- After ALL images are uploaded, make sure NO file dialogs are still open (press Escape if needed)
- Images upload to the Universal form and auto-populate to all marketplace tabs
"""
        elif images:
            image_list = "\n".join(
                [f"  {i+1}. {url}" for i, url in enumerate(images[:self.MAX_IMAGES])]
            )
            return f"""
STEP 2 - Upload Images (16 max):
- Click the "+ Upload Images" area at the top of the form
- Upload these images in order:
{image_list}
- Wait for each upload to complete (thumbnail appears)
- If there's an image crop modal, click "Apply" or "Done"
"""
        else:
            return """
STEP 2 - Images:
- Skip image upload if none provided
- Note: Images are important for listings but may not block Save
"""

    def _infer_poshmark_category_targets(
        self,
        listing: Dict[str, Any],
        category: str,
        subcategory: str,
    ) -> Dict[str, str]:
        """Infer a best-guess category path + subcategory for tree dropdowns."""
        title = listing.get("title", "")
        description = listing.get("description", "")
        combined = " ".join([title, category, subcategory, description]).lower()

        def has_any(*terms: str) -> bool:
            """Check if any term appears as a whole word (not substring) in combined text."""
            import re as _re
            return any(_re.search(r'\b' + _re.escape(t) + r'\b', combined) for t in terms)

        # Determine top-level category using word-boundary matching.
        # IMPORTANT: Check Women BEFORE Men because 'women' contains 'men'.
        # Check Kids before Men/Women for children's items.
        top = "Women"  # default
        if has_any("kid", "kids", "youth", "toddler", "baby", "girls", "boys", "infant", "children"):
            top = "Kids"
        elif has_any("women", "women's", "womens", "woman", "ladies", "female"):
            top = "Women"
        elif has_any("men", "men's", "mens", "male", "guy", "gentleman"):
            top = "Men"
        elif has_any("pet", "dog", "cat"):
            top = "Pets"
        elif has_any("home", "decor", "kitchen", "bath", "bed", "furniture"):
            top = "Home"
        elif has_any("electronic", "phone", "laptop", "tablet", "camera", "headphone"):
            top = "Electronics"

        leaf = "Accessories"
        if has_any("dress", "gown", "maxi", "mini dress", "midi"):
            leaf = "Dresses"
        elif has_any("blouse", "button down", "button-down", "shirt", "top", "tee", "t-shirt"):
            leaf = "Tops"
        elif has_any("sweater", "cardigan", "hoodie"):
            leaf = "Sweaters"
        elif has_any("jacket", "coat", "blazer"):
            leaf = "Jackets & Coats"
        elif has_any("jeans", "denim"):
            leaf = "Jeans"
        elif has_any("pants", "trouser", "leggings"):
            leaf = "Pants"
        elif has_any("skirt"):
            leaf = "Skirts"
        elif has_any("shorts"):
            leaf = "Shorts"
        elif has_any("shoe", "sneaker", "boot", "heel", "sandal", "loafer"):
            leaf = "Shoes"
        elif has_any("bag", "purse", "handbag", "tote", "backpack", "wallet"):
            leaf = "Bags"
        elif has_any("jewelry", "necklace", "ring", "bracelet", "earring", "earrings"):
            leaf = "Jewelry"
        elif has_any("activewear", "athletic", "gym", "yoga"):
            leaf = "Activewear"

        category_path = f"{top} > {leaf}"

        subcat = subcategory
        if not subcat:
            if leaf == "Tops":
                if has_any("button down", "button-down"):
                    subcat = "Button Down Shirts"
                elif has_any("blouse"):
                    subcat = "Blouses"
                elif has_any("tank"):
                    subcat = "Tank Tops"
                elif has_any("tee", "t-shirt"):
                    subcat = "T-Shirts"
                else:
                    subcat = "Blouses"
            elif leaf == "Shoes":
                if has_any("boot"):
                    subcat = "Boots"
                elif has_any("sneaker"):
                    subcat = "Sneakers"
                elif has_any("heel"):
                    subcat = "Heels"
                else:
                    subcat = "Shoes"
            elif leaf == "Bags":
                if has_any("backpack"):
                    subcat = "Backpacks"
                elif has_any("wallet"):
                    subcat = "Wallets"
                else:
                    subcat = "Handbags"
            elif leaf == "Accessories":
                if has_any("belt"):
                    subcat = "Belts"
                elif has_any("hat", "beanie", "cap"):
                    subcat = "Hats"
                elif has_any("scarf"):
                    subcat = "Scarves"
                else:
                    subcat = "Accessories"
            else:
                subcat = leaf

        return {
            "top": top,
            "leaf": leaf,
            "path": category_path,
            "subcategory": subcat,
        }

    def _build_marketplace_tabs_section(
        self,
        listing: Dict[str, Any],
        category: str,
        subcategory: str,
        size: str,
    ) -> str:
        """
        Build instructions for filling each marketplace-specific tab.

        Critical: The agent must stay on the item page and click each tab
        in the left sidebar — NOT navigate away or start a new item.
        """
        posh_targets = self._infer_poshmark_category_targets(listing, category, subcategory)

        # Poshmark-specific fields
        poshmark_section = f"""
STEP 16 — POSHMARK TAB (CLICK THE TAB IN THE LEFT SIDEBAR — DO NOT NAVIGATE):
- CLICK the "Poshmark" tab in the left sidebar
- If it says "Not connected", SKIP to Mercari
- Fill required fields:

    a) Category & Subcategory (REQUIRED — TWO SEPARATE DROPDOWNS):
     
     STEP A1 — CATEGORY DROPDOWN (LEFT SIDE — TREE STRUCTURE):
     - Find the "Category" dropdown on the LEFT side (shows "Required *" in red)
     - Click it ONCE to OPEN the dropdown — a floating panel/popover will appear
     - You will see a TREE with expandable categories: Electronics, Home, Kids, Men, Pets, Women
     - Each has a small arrow (▸/▶) — clicking the ARROW expands subcategories
     - Target: "{posh_targets['path']}"
     
     DO THIS EXACTLY:
     1. Click the arrow/triangle (▸) next to "{posh_targets['top']}" to EXPAND it (do NOT click the text yet)
     2. After expanding, indented subcategories appear below it:
        * {posh_targets['top']} > Accessories
        * {posh_targets['top']} > Bags  
        * {posh_targets['top']} > Dresses
        * {posh_targets['top']} > Tops
        * {posh_targets['top']} > Shoes
        * etc.
     3. If you don't see "{posh_targets['leaf']}" in the visible list, you need to SCROLL
        INSIDE THE DROPDOWN PANEL — NOT the page itself.
        - The dropdown is a scrollable container/popover with its own scrollbar
        - Use scroll_down on the DROPDOWN ELEMENT (the floating panel), NOT index 0 / the page
        - Look for the dropdown's list/popover container element and scroll THAT element
     4. CLICK on "{posh_targets['top']} > {posh_targets['leaf']}" (or just "{posh_targets['leaf']}" under {posh_targets['top']})
     5. The dropdown will close and Category field shows your selection
     
     IF STUCK: close the dropdown, reopen it, and try typing "{posh_targets['leaf']}" to filter.
     VERIFY: Category field no longer shows "Required *" — it shows a value like "{posh_targets['path']}"
     
     STEP A2 — SUBCATEGORY DROPDOWN (RIGHT SIDE — FLAT LIST):
     - Find the "Subcategory" dropdown on the RIGHT side (still shows "Required *")
     - This is a SEPARATE, SECOND dropdown — NOT the same as Category
     - Click it ONCE to OPEN it — a flat list appears in a popover
     - These options depend on what you selected in Category
     - Look for "{posh_targets['subcategory']}" in the list
     - If you don't see it, SCROLL INSIDE THE DROPDOWN POPOVER (not the page)
     - CLICK the option "{posh_targets['subcategory']}" (or closest match)
     - VERIFY: Subcategory field shows a value (not "Required *")
     
     SCROLLING RULE: When any dropdown is open, ALWAYS scroll the dropdown's floating
     panel/popover element — NEVER scroll the main page. The dropdown panel is a separate
     scrollable container that appears above the form.
     
     IMPORTANT: You MUST fill BOTH dropdowns. Move on only when BOTH show values (not "Required *")

    b) Size (REQUIRED):
     - Click Size dropdown, select "{size if size else 'M'}"

  c) Original Price (if field exists):
     - Enter: {listing.get("original_price", listing.get("price", 0))}

    d) ANY other fields with asterisk (*) or red highlight — fill them

- Click "Save", wait for confirmation
- DO NOT navigate away after saving
"""

        # Mercari-specific fields
        mercari_section = f"""
STEP 17 — MERCARI TAB (CLICK THE TAB IN THE LEFT SIDEBAR — DO NOT NAVIGATE):
- CLICK the "Mercari" tab in the sidebar
- If it says "Not connected", SKIP to eBay
- Fill required fields:

  a) Category (REQUIRED — TREE DROPDOWN WITH EXPANSION):
     - Click the Category dropdown to OPEN it — a floating panel appears
     - You will see a TREE with expandable top-level categories
     - Target: "{posh_targets['path']}"
     - Click the ARROW (▸) next to "{posh_targets['top']}" to EXPAND it
     - Then find and CLICK "{posh_targets['leaf']}" under {posh_targets['top']}
     - SCROLLING: If you need to scroll to see more options, scroll INSIDE THE DROPDOWN
       PANEL (the floating popover element), NOT the main page
     - If there is a SEPARATE Subcategory dropdown, click it and select "{posh_targets['subcategory']}"
     - VERIFY: Category field shows a value (not "Required *")

  b) Size (if the field appears):
     - Click Size dropdown, select "{size if size else 'M'}"

  c) Shipping:
     - If shipping options appear, select a reasonable default
     - Prefer prepaid/standard options

  d) ANY other fields marked required — fill them

- Click "Save", wait for confirmation
- DO NOT navigate away
"""

        # eBay-specific fields
        ebay_section = f"""
STEP 18 — EBAY TAB (CLICK THE TAB IN THE LEFT SIDEBAR — DO NOT NAVIGATE):
- CLICK the "eBay" tab in the sidebar
- If it says "Not connected", SKIP eBay entirely
- Fill required fields:

  a) Category (REQUIRED — TREE DROPDOWN WITH EXPANSION):
     - Click the Category dropdown to OPEN it — a floating panel appears
     - You will see a TREE with expandable top-level categories
     - Target: "{posh_targets['path']}"
     - Click the ARROW (▸) next to "{posh_targets['top']}" to EXPAND it
     - Then find and CLICK "{posh_targets['leaf']}" under {posh_targets['top']}
     - SCROLLING: If you need to scroll to see more options, scroll INSIDE THE DROPDOWN
       PANEL (the floating popover element), NOT the main page
     - If there is a SEPARATE Subcategory dropdown, click it and select "{posh_targets['subcategory']}"
     - VERIFY: Category field shows a value (not "Required *")

  b) Item Specifics (fill all that appear):
     - Brand, Size, Color, Material — fill any that are shown
     - Some may already be populated from Universal form

  c) Condition Description (if field appears):
     - Enter: "See photos for full details."

  d) Shipping:
     - If shipping options appear, prefer Free Shipping or USPS Ground Advantage

  e) ANY other required fields — fill them

- Click "Save" at the bottom
- Wait for save confirmation
"""

        return f"""{poshmark_section}
{mercari_section}
{ebay_section}

STEP 19 — OTHER TABS (Depop, Facebook, Etsy):
- If any other marketplace tabs are visible AND connected, click them, fill fields, and Save
- If they say "Not connected", SKIP them
"""

    def _extract_listing_url(self, history: Any) -> Optional[str]:
        """
        Extract the Flyp item URL from browser-use agent history.

        Flyp URLs follow the pattern:
        - tools.joinflyp.com/item/new (create — ignore this)
        - tools.joinflyp.com/item/[item-id] (saved item)
        - tools.joinflyp.com/my-items (list view)
        """
        if not history:
            return None

        # Patterns for Flyp item URLs (specific item page preferred)
        url_patterns = [
            # Specific item URL (highest priority): /item/ followed by NOT "new"
            r'https?://tools\.joinflyp\.com/item/(?!new)[a-zA-Z0-9\-_]+',
            # My items page (fallback)
            r'https?://tools\.joinflyp\.com/my-items(?:\?.*)?',
        ]

        # Try to get from final result first
        if hasattr(history, "final_result"):
            final = history.final_result()
            if final:
                for pattern in url_patterns:
                    matches = re.findall(pattern, str(final))
                    if matches:
                        return matches[-1]

        # Search through entire history
        history_str = str(history)
        for pattern in url_patterns:
            matches = re.findall(pattern, history_str)
            if matches:
                return matches[-1]

        # Try to extract from history actions
        if hasattr(history, "history"):
            for action in history.history:
                if hasattr(action, "result") and action.result:
                    for pattern in url_patterns:
                        result_matches = re.findall(pattern, str(action.result))
                        if result_matches:
                            return result_matches[-1]

        return None


class FlypBulkAgent(FlypCrosslisterAgent):
    """
    Extended Flyp agent for bulk item creation.

    Efficiently creates multiple items in a single Flyp session,
    all saved as drafts for user review.
    """

    async def create_bulk_items(
        self,
        listings: List[Dict[str, Any]],
        session: Dict[str, Any],
        batch_size: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Create multiple items on Flyp in batches.

        Args:
            listings: List of listing data
            session: User's Flyp session
            batch_size: Number of items per batch (prevents rate limiting)

        Returns:
            List of results for each item
        """
        results = []

        for i in range(0, len(listings), batch_size):
            batch = listings[i : i + batch_size]

            logger.info(
                "Processing Flyp bulk batch",
                batch_number=i // batch_size + 1,
                batch_size=len(batch),
                total_items=len(listings),
            )

            for listing in batch:
                result = await self.create_listing(listing, session)
                results.append(result)

                # Brief delay between items (configurable via env)
                if result.get("success"):
                    import asyncio
                    delay = float(os.getenv("FLYP_ITEM_DELAY", "1.0"))
                    await asyncio.sleep(delay)

        return results


class FlypDraftAgent(FlypCrosslisterAgent):
    """
    Flyp agent explicitly configured for draft-only saves.

    This is the default behavior, but this subclass makes the intent
    explicit and provides additional safety checks.
    """

    def _build_task_prompt(self, listing: Dict[str, Any]) -> str:
        """
        Build prompt with extra emphasis on save-only behavior.
        """
        base_prompt = super()._build_task_prompt(listing)

        # Add extra safety header
        safety_header = """
⚠️  CRITICAL SAFETY RULE ⚠️
This agent MUST ONLY SAVE items — NEVER list or publish them.
The user will review and list items manually from their Flyp dashboard.
If you cannot find a "Save" button, report the issue — do NOT click any publish/list button.

"""
        return safety_header + base_prompt
