"""
Base Agent - Abstract base class for marketplace agents (2026 Best Practices)

Provides common functionality for all marketplace automation agents.
Uses browser-use library with cloud browsers for autonomous automation.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from enum import Enum
import os
import ssl
import certifi
import asyncio
import tempfile
import urllib.request
import structlog

# browser-use 2026 API - uses its own LLM wrappers, NOT langchain
from browser_use import Agent, Browser, ChatOpenAI
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
    - Browser initialization with cloud support via browser-use
    - Dedicated automation Chrome profile (runs alongside your normal Chrome)
    - Session/cookie management from captured sessions
    - Error handling and retries
    - Logging and metrics
    
    Uses browser-use library (2026) for AI-powered browser automation.
    
    Modes:
    - CLOUD: Uses session capture, runs in background (for production)
    - LOCAL: Launches a separate automation Chrome (for testing/personal use)
           Your normal Chrome stays open — no conflicts, no CDP needed
    """
    
    # Marketplace-specific settings (override in subclasses)
    MARKETPLACE_NAME: str = "unknown"
    MARKETPLACE_URL: str = ""
    CREATE_LISTING_URL: str = ""
    MAX_STEPS: int = 50
    TIMEOUT_SECONDS: int = 120
    
    def __init__(self, mode: str = "cloud"):
        """
        Initialize agent.
        
        Args:
            mode: "cloud" (session capture) or "local" (CDP connect)
        """
        self.mode = mode.lower()
        self.browser_use_api_key = os.getenv("BROWSER_USE_API_KEY")
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        self.headless = os.getenv("BROWSER_HEADLESS", "true").lower() == "true"
        self.max_steps = int(os.getenv("MAX_AGENT_STEPS", str(self.MAX_STEPS)))
        self.timeout = int(os.getenv("BROWSER_TIMEOUT", str(self.TIMEOUT_SECONDS)))
        
        if self.mode == "local":
            logger.info(
                "Agent in LOCAL mode — will launch dedicated automation Chrome",
                marketplace=self.MARKETPLACE_NAME,
            )
        else:
            if not self.browser_use_api_key:
                logger.warning(
                    "BROWSER_USE_API_KEY not set - cloud browser features disabled",
                    marketplace=self.MARKETPLACE_NAME
                )
        
        if not self.openrouter_api_key:
            logger.warning(
                "OPENROUTER_API_KEY not set - AI features may be limited",
                marketplace=self.MARKETPLACE_NAME
            )
    
    def _get_llm(self):
        """
        Get the LLM for browser-use agent.
        
        Uses browser-use's own ChatOpenAI wrapper (not langchain).
        Supports OpenRouter as an OpenAI-compatible provider.
        """
        return ChatOpenAI(
            model="google/gemini-2.5-flash",
            api_key=self.openrouter_api_key,
            base_url="https://openrouter.ai/api/v1",
        )
    
    def _get_browser(
        self, 
        session: Optional[Dict[str, Any]] = None
    ) -> Browser:
        """
        Initialize browser based on mode.
        
        CLOUD MODE (default):
            - Creates new browser instance with browser-use
            - Injects captured session cookies for authentication
            - Runs headless in production
            
        LOCAL MODE:
            - Connects to user's existing Chrome via CDP
            - Uses existing cookies/sessions (no injection needed)
            - User must start Chrome with: --remote-debugging-port=9222
        
        Args:
            session: User session with encrypted cookies (cloud mode only)
            
        Returns:
            Configured Browser instance
        """
        if self.mode == "local":
            return self._get_local_browser()
        else:
            return self._get_cloud_browser(session)
    
    def _get_local_browser(self) -> Browser:
        """
        Launch a dedicated automation Chrome alongside the user's normal Chrome.
        
        How it works (2026 best practice):
        - Uses a SEPARATE Chrome profile directory (~/.chrome-automation/)
        - This means it runs as a completely independent Chrome instance
        - User's normal Chrome stays open and untouched — no conflicts
        - User logs into Flyp ONCE in the automation Chrome; sessions persist
        - No CDP flags, no port forwarding, no profile locking issues
        
        First run: Automation Chrome opens → user logs into Flyp → done.
        Every run after: Automation Chrome opens already logged in.
        """
        import platform
        
        system = platform.system()
        
        if system == "Darwin":  # macOS
            executable = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        elif system == "Windows":
            executable = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
        else:  # Linux
            executable = "/usr/bin/google-chrome"
        
        executable = os.getenv("CHROME_EXECUTABLE_PATH", executable)
        
        # Dedicated automation profile — separate from user's real Chrome
        # This is the key: a different user-data-dir means no profile lock conflict
        default_automation_dir = os.path.expanduser("~/.chrome-automation")
        automation_data_dir = os.getenv("CHROME_AUTOMATION_DIR", default_automation_dir)
        
        # Create dir if it doesn't exist (first run)
        os.makedirs(automation_data_dir, exist_ok=True)
        
        logger.info(
            "Launching automation Chrome (separate from your normal Chrome)",
            marketplace=self.MARKETPLACE_NAME,
            automation_dir=automation_data_dir,
        )
        
        # Speed mode: use env var to control wait times (default: fast)
        speed_mode = os.getenv("BROWSER_SPEED_MODE", "fast").lower()
        
        if speed_mode == "slow":
            page_wait = 3.0
            network_wait = 5.0
            action_wait = 1.0
        elif speed_mode == "normal":
            page_wait = 1.5
            network_wait = 2.5
            action_wait = 0.5
        else:  # fast (default)
            page_wait = 0.8
            network_wait = 1.5
            action_wait = 0.3
        
        return Browser(
            executable_path=executable,
            user_data_dir=automation_data_dir,
            headless=False,
            keep_alive=True,
            minimum_wait_page_load_time=page_wait,
            wait_for_network_idle_page_load_time=network_wait,
            wait_between_actions=action_wait,
        )
    
    def _get_cloud_browser(
        self, 
        session: Optional[Dict[str, Any]] = None
    ) -> Browser:
        """
        Initialize cloud browser with session cookies.
        
        Uses browser-use Browser API with storage_state for cookies.
        
        Args:
            session: User session with encrypted cookies
            
        Returns:
            Configured Browser instance with cookies loaded
        """
        browser_kwargs = {
            "headless": self.headless,
            "disable_security": True,  # Required for cross-origin cookie injection
        }
        
        # If we have a Browser-Use Cloud API key, use cloud browsers
        if self.browser_use_api_key:
            browser_kwargs["use_cloud"] = True
        
        # Load cookies as storage_state if available
        if session and session.get("encrypted_cookies"):
            try:
                import asyncio
                cookies = asyncio.get_event_loop().run_until_complete(
                    self._decrypt_and_parse_cookies(session["encrypted_cookies"])
                )
                if cookies:
                    # Pass as storage_state dict
                    browser_kwargs["storage_state"] = {
                        "cookies": cookies,
                        "origins": []
                    }
                    logger.info(
                        "Loaded session cookies into storage_state",
                        marketplace=self.MARKETPLACE_NAME,
                        cookie_count=len(cookies)
                    )
            except Exception as e:
                logger.error(
                    "Failed to load session cookies",
                    marketplace=self.MARKETPLACE_NAME,
                    error=str(e)
                )
        
        return Browser(**browser_kwargs)
    
    async def _decrypt_and_parse_cookies(self, encrypted_cookies: str) -> List[Dict[str, Any]]:
        """
        Decrypt and parse cookies from database.
        
        Decrypts AES-256-GCM encrypted cookie data from TypeScript encryption.
        Format: salt (32) + iv (12) + authTag (16) + ciphertext
        """
        import json
        import base64
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        
        encryption_key = os.getenv("SESSION_ENCRYPTION_KEY")
        if not encryption_key:
            logger.warning("SESSION_ENCRYPTION_KEY not set - cannot decrypt cookies")
            return []
        
        try:
            # Decode base64 encrypted data
            encrypted_data = base64.b64decode(encrypted_cookies)
            
            # Constants matching TypeScript
            SALT_LENGTH = 32
            IV_LENGTH = 12
            AUTH_TAG_LENGTH = 16
            
            # Extract components
            salt = encrypted_data[:SALT_LENGTH]
            iv = encrypted_data[SALT_LENGTH:SALT_LENGTH + IV_LENGTH]
            auth_tag = encrypted_data[SALT_LENGTH + IV_LENGTH:SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH]
            ciphertext = encrypted_data[SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH:]
            
            # Derive key using PBKDF2 (same as TypeScript)
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,  # 256 bits
                salt=salt,
                iterations=100000,
            )
            derived_key = kdf.derive(encryption_key.encode('utf-8'))
            
            # Decrypt using AES-GCM
            # GCM expects ciphertext + auth_tag concatenated
            aesgcm = AESGCM(derived_key)
            decrypted = aesgcm.decrypt(iv, ciphertext + auth_tag, None)
            
            # Parse JSON
            cookies = json.loads(decrypted.decode('utf-8'))
            
            # Convert to Playwright cookie format
            playwright_cookies = []
            for cookie in cookies:
                playwright_cookies.append({
                    "name": cookie.get("name"),
                    "value": cookie.get("value"),
                    "domain": cookie.get("domain"),
                    "path": cookie.get("path", "/"),
                    "secure": cookie.get("secure", False),
                    "httpOnly": cookie.get("httpOnly", False),
                    "sameSite": cookie.get("sameSite", "Lax"),
                })
            
            return playwright_cookies
            
        except Exception as e:
            logger.error("Cookie decryption failed", error=str(e))
            return []
    
    async def _download_images(self, image_urls: List[str]) -> List[str]:
        """
        Download images from URLs (Supabase storage) to local temp files.
        
        browser-use's upload_file action requires LOCAL file paths.
        Images from the frontend are stored as Supabase public URLs.
        We download them to a temp directory so the agent can upload them.
        
        Args:
            image_urls: List of image URLs (Supabase storage public URLs)
            
        Returns:
            List of local file paths to downloaded images
        """
        if not image_urls:
            return []
        
        local_paths = []
        temp_dir = tempfile.mkdtemp(prefix="listing-images-")
        
        # Create SSL context with certifi certs to avoid SSL errors
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        
        for i, url in enumerate(image_urls):
            try:
                # Determine file extension from URL
                ext = ".jpg"  # default
                if ".png" in url.lower():
                    ext = ".png"
                elif ".webp" in url.lower():
                    ext = ".webp"
                elif ".gif" in url.lower():
                    ext = ".gif"
                
                local_path = os.path.join(temp_dir, f"image_{i+1}{ext}")
                
                logger.info(
                    f"Downloading image {i+1}/{len(image_urls)}",
                    url=url[:80] + "..." if len(url) > 80 else url,
                    dest=local_path
                )
                
                # Download with SSL context
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, context=ssl_context) as response:
                    with open(local_path, "wb") as f:
                        f.write(response.read())
                
                local_paths.append(local_path)
                logger.info(f"Downloaded image {i+1}", path=local_path, size=os.path.getsize(local_path))
                
            except Exception as e:
                logger.error(f"Failed to download image {i+1}", url=url, error=str(e))
        
        return local_paths
    
    def _cleanup_temp_images(self, paths: List[str]):
        """Clean up temporary downloaded image files."""
        import shutil
        if not paths:
            return
        # All images are in the same temp dir
        temp_dir = os.path.dirname(paths[0])
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
            logger.info("Cleaned up temp images", dir=temp_dir)
        except Exception:
            pass
    
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
        session: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a listing on the marketplace using browser-use AI agent.
        
        Args:
            listing: Optimized listing data with platform-specific content
            session: User's marketplace session with encrypted cookies
                    (required for CLOUD mode, ignored in LOCAL mode)
            
        Returns:
            AgentResult as dictionary with success status, URL, and metadata
        """
        logger.info(
            "Starting listing creation with browser-use",
            marketplace=self.MARKETPLACE_NAME,
            mode=self.mode,
            title=listing.get("title", "Unknown")
        )
        
        # Validate session for cloud mode
        if self.mode == "cloud" and not session:
            return AgentResult(
                success=False,
                marketplace=self.MARKETPLACE_NAME,
                error="Session required for cloud mode - ensure sessions are synced from browser extension",
            ).to_dict()
        
        browser = None
        downloaded_images = []
        try:
            # Get LLM for AI-powered automation
            llm = self._get_llm()
            
            # Initialize browser based on mode
            # - Cloud mode: Creates new browser, injects session cookies
            # - Local mode: Connects to user's existing Chrome (no session needed)
            browser = self._get_browser(session if self.mode == "cloud" else None)
            
            # Download images from URLs (Supabase storage) to local temp files
            # browser-use upload_file requires local paths, not URLs
            image_urls = listing.get("images", [])
            if image_urls:
                logger.info(
                    "Downloading listing images for upload",
                    count=len(image_urls),
                    marketplace=self.MARKETPLACE_NAME
                )
                downloaded_images = await self._download_images(image_urls)
                
                if downloaded_images:
                    # Replace URLs with local paths in listing for the prompt
                    listing = {**listing, "_local_image_paths": downloaded_images}
                    logger.info(
                        "Images ready for upload",
                        count=len(downloaded_images),
                        marketplace=self.MARKETPLACE_NAME
                    )
                else:
                    logger.warning(
                        "No images could be downloaded",
                        marketplace=self.MARKETPLACE_NAME
                    )
            
            # Build marketplace-specific task prompt
            task_prompt = self._build_task_prompt(listing)
            
            logger.info(
                "Creating browser-use agent",
                marketplace=self.MARKETPLACE_NAME,
                mode=self.mode,
                max_steps=self.max_steps
            )
            
            # Create browser-use Agent with the task (browser-use 0.11+ API)
            agent = Agent(
                task=task_prompt,
                llm=llm,
                browser=browser,
                max_actions_per_step=5,
                # Pass downloaded image paths so browser-use can upload them
                available_file_paths=downloaded_images if downloaded_images else None,
                # Be patient with slow-loading pages (React SPAs like Mercari)
                tool_calling_method='auto',
            )
            
            # Execute with timeout
            logger.info(
                "Running browser-use agent",
                marketplace=self.MARKETPLACE_NAME,
                timeout=self.timeout
            )
            
            history = await asyncio.wait_for(
                agent.run(max_steps=self.max_steps),
                timeout=self.timeout
            )
            
            # Extract listing URL from agent history
            listing_url = self._extract_listing_url(history)
            
            # Check if agent self-reported success
            agent_reported_success = False
            final_result_text = None
            if hasattr(history, 'final_result'):
                final_result_text = history.final_result()
            if hasattr(history, 'is_done') and history.is_done():
                agent_reported_success = True
            
            # Check if the agent's final result actually indicates a failure
            # (agent can call done() with a failure message like "Session expired")
            FAILURE_KEYWORDS = [
                "session expired", "please reconnect", "captcha detected",
                "rate limit", "login required", "sign in required",
                "could not", "unable to", "failed to",
            ]
            if final_result_text and any(kw in str(final_result_text).lower() for kw in FAILURE_KEYWORDS):
                agent_reported_success = False
                logger.warning(
                    "Agent reported done but with failure message",
                    marketplace=self.MARKETPLACE_NAME,
                    agent_result=str(final_result_text)[:200]
                )
            
            if listing_url:
                result = AgentResult(
                    success=True,
                    marketplace=self.MARKETPLACE_NAME,
                    url=listing_url,
                    steps_taken=len(history.history) if hasattr(history, 'history') else 0,
                    metadata={"listing_id": listing.get("id")}
                )
                logger.info(
                    "Listing created successfully",
                    marketplace=self.MARKETPLACE_NAME,
                    url=listing_url
                )
            elif agent_reported_success:
                # Agent said it succeeded but didn't capture URL — still a success
                result = AgentResult(
                    success=True,
                    marketplace=self.MARKETPLACE_NAME,
                    url=None,
                    steps_taken=len(history.history) if hasattr(history, 'history') else 0,
                    metadata={
                        "listing_id": listing.get("id"),
                        "note": "Listing created but URL not captured",
                        "agent_result": str(final_result_text)[:500] if final_result_text else None,
                    }
                )
                logger.info(
                    "Listing created (URL not captured)",
                    marketplace=self.MARKETPLACE_NAME,
                    agent_result=str(final_result_text)[:200] if final_result_text else None
                )
            else:
                # Check if we can detect success from final state
                final_url = history.final_result() if hasattr(history, 'final_result') else None
                
                result = AgentResult(
                    success=False,
                    marketplace=self.MARKETPLACE_NAME,
                    error="Could not extract listing URL - listing may have been created",
                    url=final_url,
                    steps_taken=len(history.history) if hasattr(history, 'history') else 0,
                )
                logger.warning(
                    "Listing URL not found in history",
                    marketplace=self.MARKETPLACE_NAME,
                    final_url=final_url
                )
            
            return result.to_dict()
            
        except asyncio.TimeoutError:
            logger.error(
                "Browser-use agent timed out",
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
                "Browser-use agent failed",
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
            # Clean up temp downloaded images
            if downloaded_images:
                self._cleanup_temp_images(downloaded_images)
            
            # Clean up browser
            if browser:
                try:
                    await browser.close()
                except Exception:
                    pass
