"""
Base Agent - Abstract base class for marketplace agents (2026 Best Practices)

Provides common functionality for all marketplace automation agents.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from enum import Enum
import os
import asyncio
import structlog

from browser_use import Agent, Browser, ChatBrowserUse
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = structlog.get_logger()


class AgentStatus(Enum):
    """Status of agent execution."""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    TIMEOUT = "timeout"


@dataclass
class AgentResult:
    """Standardized result from agent execution."""
    success: bool
    marketplace: str
    url: Optional[str] = None
    error: Optional[str] = None
    steps_taken: int = 0
    screenshots: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "success": self.success,
            "marketplace": self.marketplace,
            "url": self.url,
            "error": self.error,
            "steps_taken": self.steps_taken,
            "screenshots": self.screenshots,
            "metadata": self.metadata,
        }


class BaseMarketplaceAgent(ABC):
    """
    Abstract base class for marketplace automation agents.
    
    Provides common functionality:
    - Browser initialization with cloud support
    - Session/cookie management
    - Error handling and retries
    - Logging and metrics
    """
    
    # Marketplace-specific settings (override in subclasses)
    MARKETPLACE_NAME: str = "unknown"
    MARKETPLACE_URL: str = ""
    CREATE_LISTING_URL: str = ""
    MAX_STEPS: int = 50
    TIMEOUT_SECONDS: int = 120
    
    def __init__(self):
        self.api_key = os.getenv("BROWSER_USE_API_KEY")
        self.headless = os.getenv("BROWSER_HEADLESS", "true").lower() == "true"
        self.max_steps = int(os.getenv("MAX_AGENT_STEPS", str(self.MAX_STEPS)))
        self.timeout = int(os.getenv("BROWSER_TIMEOUT", str(self.TIMEOUT_SECONDS)))
        
        if not self.api_key:
            logger.warning(
                "BROWSER_USE_API_KEY not set - cloud features disabled",
                marketplace=self.MARKETPLACE_NAME
            )
    
    def _get_browser(self, session: Optional[Dict[str, Any]] = None) -> Browser:
        """
        Initialize browser with optional cloud profile for authentication.
        
        Args:
            session: User session with browser_profile_id for cloud auth
            
        Returns:
            Configured Browser instance
        """
        browser_config = {
            "headless": self.headless,
        }
        
        # Use cloud browser with user's session if available
        if session and session.get("browser_profile_id"):
            browser_config["use_cloud"] = True
            browser_config["cloud_profile_id"] = session["browser_profile_id"]
            logger.info(
                "Using cloud browser with user session",
                marketplace=self.MARKETPLACE_NAME,
                profile_id=session["browser_profile_id"]
            )
        
        return Browser(**browser_config)
    
    def _get_llm(self) -> ChatBrowserUse:
        """Get the LLM for browser-use agent."""
        return ChatBrowserUse()
    
    @abstractmethod
    def _build_task_prompt(self, listing: Dict[str, Any]) -> str:
        """
        Build the task prompt for the agent.
        
        Override in subclasses with marketplace-specific instructions.
        
        Args:
            listing: Optimized listing data
            
        Returns:
            Task prompt string for the agent
        """
        pass
    
    @abstractmethod
    def _extract_listing_url(self, history: Any) -> Optional[str]:
        """
        Extract the created listing URL from agent history.
        
        Override in subclasses with marketplace-specific extraction.
        
        Args:
            history: Agent execution history
            
        Returns:
            Listing URL if found, None otherwise
        """
        pass
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=60),
        retry=retry_if_exception_type((TimeoutError, ConnectionError)),
        reraise=True
    )
    async def create_listing(
        self,
        listing: Dict[str, Any],
        session: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a listing on the marketplace.
        
        Args:
            listing: Optimized listing data with platform-specific content
            session: User's marketplace session with cookies and profile ID
            
        Returns:
            AgentResult as dictionary with success status, URL, and metadata
        """
        logger.info(
            "Starting listing creation",
            marketplace=self.MARKETPLACE_NAME,
            title=listing.get("title", "Unknown")
        )
        
        browser = None
        try:
            # Initialize browser with user's session
            browser = self._get_browser(session)
            llm = self._get_llm()
            
            # Build marketplace-specific task prompt
            task_prompt = self._build_task_prompt(listing)
            
            # Create and run the agent
            agent = Agent(
                task=task_prompt,
                llm=llm,
                browser=browser,
                max_steps=self.max_steps,
            )
            
            # Execute with timeout
            history = await asyncio.wait_for(
                agent.run(),
                timeout=self.timeout
            )
            
            # Extract listing URL from history
            listing_url = self._extract_listing_url(history)
            
            if listing_url:
                result = AgentResult(
                    success=True,
                    marketplace=self.MARKETPLACE_NAME,
                    url=listing_url,
                    steps_taken=len(history) if history else 0,
                    metadata={"listing_id": listing.get("id")}
                )
                logger.info(
                    "Listing created successfully",
                    marketplace=self.MARKETPLACE_NAME,
                    url=listing_url
                )
            else:
                result = AgentResult(
                    success=False,
                    marketplace=self.MARKETPLACE_NAME,
                    error="Could not extract listing URL - listing may have been created",
                    steps_taken=len(history) if history else 0,
                )
                logger.warning(
                    "Listing URL not found in history",
                    marketplace=self.MARKETPLACE_NAME
                )
            
            return result.to_dict()
            
        except asyncio.TimeoutError:
            logger.error(
                "Agent timed out",
                marketplace=self.MARKETPLACE_NAME,
                timeout=self.timeout
            )
            return AgentResult(
                success=False,
                marketplace=self.MARKETPLACE_NAME,
                error=f"Automation timed out after {self.timeout} seconds",
            ).to_dict()
            
        except Exception as e:
            logger.error(
                "Agent failed",
                marketplace=self.MARKETPLACE_NAME,
                error=str(e),
                exc_info=True
            )
            return AgentResult(
                success=False,
                marketplace=self.MARKETPLACE_NAME,
                error=str(e),
            ).to_dict()
            
        finally:
            # Ensure browser is closed
            if browser:
                try:
                    await browser.close()
                except Exception:
                    pass
