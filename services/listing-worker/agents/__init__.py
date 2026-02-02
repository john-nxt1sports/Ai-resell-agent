"""
Marketplace Agents Package (2026 Best Practices)

Provides browser-use powered agents for cross-listing automation.
"""

from .base_agent import BaseMarketplaceAgent, AgentResult

# Marketplace-specific agents
from .poshmark_agent import (
    PoshmarkListingAgent,
    PoshmarkBulkAgent,
)
from .ebay_agent import (
    EbayListingAgent,
    EbayDraftAgent,
)
from .mercari_agent import (
    MercariListingAgent,
    MercariSmartPricingAgent,
)

# Content optimization
from .researcher import ResearcherAgent, OptimizedContent

__all__ = [
    # Base
    "BaseMarketplaceAgent",
    "AgentResult",
    
    # Poshmark
    "PoshmarkListingAgent",
    "PoshmarkBulkAgent",
    
    # eBay
    "EbayListingAgent",
    "EbayDraftAgent",
    
    # Mercari
    "MercariListingAgent",
    "MercariSmartPricingAgent",
    
    # Research
    "ResearcherAgent",
    "OptimizedContent",
]
