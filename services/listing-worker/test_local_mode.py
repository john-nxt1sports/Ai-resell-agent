#!/usr/bin/env python3
"""
Local Mode Test Script - Test listing automation on your own browser

This script allows you to test the browser-use automation directly on your
local Chrome browser. No session capture needed - it uses your existing
logged-in cookies!

Usage:
1. QUIT Chrome completely first (Cmd+Q on Mac)
2. Run this script - it will launch Chrome with your profile:
   python test_local_mode.py --marketplace poshmark

The agent will open Chrome with YOUR cookies/logins and automate from there.
"""

import asyncio
import argparse
import os
import sys
import ssl
import certifi
from dotenv import load_dotenv

load_dotenv()

# Fix SSL for macOS Python
os.environ.setdefault("SSL_CERT_FILE", certifi.where())

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agents.poshmark_agent import PoshmarkListingAgent
from agents.ebay_agent import EbayListingAgent
from agents.mercari_agent import MercariListingAgent
from agents.flyp_agent import FlypCrosslisterAgent


# Sample test listing data — uses real downloadable images
# In production, these would be Supabase storage public URLs from the frontend
TEST_LISTING = {
    "id": "test-124",
    "title": "INC Black Button Down Shirt Women's Size 10 Ruched Sleeve Collared Cotton Blend",
    "description": (
        "INC International Concepts black button down shirt in excellent condition. "
        "Women's Size 10. Features ruched sleeves and a classic collared design. "
        "Made from a soft cotton blend material. Perfect for work or casual wear. "
        "No stains, tears, or missing buttons. "
        "From a smoke-free, pet-free home. Ships within 24 hours with tracking."
    ),
    "price": 28,
    "original_price": 69,
    "brand": "INC International Concepts",
    "category": "Women",
    "subcategory": "Tops",
    "size": "10",
    "color": "Black",
    "condition": "like_new",
    "images": [
        # Real downloadable test images (public domain shirt photos)
        # Replace these with YOUR actual Supabase image URLs for real tests
        "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80",
        "https://images.unsplash.com/photo-1620799139507-2a76f79a2f4d?w=800&q=80",
    ],
}


async def test_local_mode(marketplace: str, dry_run: bool = False):
    """
    Test local mode listing creation.
    
    Args:
        marketplace: poshmark, ebay, or mercari
        dry_run: If True, just test connection without creating listing
    """
    print(f"\n{'='*60}")
    print(f"  LOCAL MODE TEST - {marketplace.upper()}")
    print(f"{'='*60}\n")
    
    # Check if required env vars are set
    if not os.getenv("OPENROUTER_API_KEY"):
        print("❌ ERROR: OPENROUTER_API_KEY not set")
        print("   Set it in .env file or export OPENROUTER_API_KEY=your_key")
        return
    
    # Create agent in LOCAL mode
    agents = {
        "poshmark": PoshmarkListingAgent,
        "ebay": EbayListingAgent,
        "mercari": MercariListingAgent,
        "flyp": FlypCrosslisterAgent,
    }
    
    agent_class = agents.get(marketplace.lower())
    if not agent_class:
        print(f"❌ Unknown marketplace: {marketplace}")
        print(f"   Available: {', '.join(agents.keys())}")
        return
    
    print(f"✅ Creating {marketplace} agent in LOCAL mode...")
    agent = agent_class(mode="local")
    
    print(f"\n📋 Test Listing:")
    print(f"   Title: {TEST_LISTING['title']}")
    print(f"   Price: ${TEST_LISTING['price']}")
    print(f"   Brand: {TEST_LISTING['brand']}")
    print(f"   Size: {TEST_LISTING['size']}")
    
    if dry_run:
        print("\nDRY RUN - Testing browser launch only...")
        try:
            from browser_use import Browser
            browser = agent._get_local_browser()
            print("Browser object created successfully!")
            print("NOTE: Quit Chrome first, then the agent will launch it with your profile.")
            print("\nConnection test successful!")
        except Exception as e:
            print(f"\nBrowser creation failed: {e}")
            print("\nMake sure Chrome is fully quit (Cmd+Q on Mac)")
        
        return
    
    print("\n🚀 Starting automation...")
    print("   (Watch your Chrome window!)\n")
    
    try:
        result = await agent.create_listing(TEST_LISTING, session=None)
        
        print(f"\n{'='*60}")
        print("  RESULT")
        print(f"{'='*60}")
        
        if result.get("success"):
            print(f"✅ Listing created successfully!")
            print(f"   URL: {result.get('url', 'N/A')}")
        else:
            print(f"❌ Listing creation failed")
            print(f"   Error: {result.get('error', 'Unknown error')}")
        
        print(f"\n   Steps taken: {result.get('steps_taken', 'N/A')}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


def main():
    parser = argparse.ArgumentParser(
        description="Test local mode listing automation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Test browser creation (dry run)
  python test_local_mode.py --marketplace poshmark --dry-run
  
  # Create actual listing on Poshmark
  python test_local_mode.py --marketplace poshmark
  
  # Test on eBay
  python test_local_mode.py --marketplace ebay

Before running:
1. QUIT Chrome completely (Cmd+Q)
2. Run this script - it launches Chrome with your profile
        """
    )
    
    parser.add_argument(
        "--marketplace", "-m",
        required=True,
        choices=["poshmark", "ebay", "mercari", "flyp"],
        help="Which marketplace to test"
    )
    
    parser.add_argument(
        "--dry-run", "-d",
        action="store_true",
        help="Only test browser creation, don't create listing"
    )
    
    args = parser.parse_args()
    
    # Run test
    asyncio.run(test_local_mode(args.marketplace, args.dry_run))


if __name__ == "__main__":
    main()
