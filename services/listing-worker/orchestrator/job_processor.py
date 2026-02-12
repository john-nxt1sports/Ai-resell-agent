"""
Job Processor - Orchestrates listing creation across marketplaces (2026 Best Practices)
"""

import asyncio
import os
from typing import Dict, Any, List
import structlog
from datetime import datetime

from agents.researcher import ResearcherAgent
from agents.poshmark_agent import PoshmarkListingAgent
from agents.ebay_agent import EbayListingAgent
from agents.mercari_agent import MercariListingAgent
from agents.flyp_agent import FlypCrosslisterAgent
from orchestrator.state_manager import StateManager
from utils.session_loader import SessionLoader

logger = structlog.get_logger()


class JobProcessor:
    """
    Processes listing jobs by coordinating multiple agents.
    
    Flow:
    1. Load user sessions from database (cloud mode only)
    2. Research and optimize listing content (Researcher Agent)
    3. Post to each marketplace in parallel (Platform-specific Agents)
    4. Save results and notify user
    
    Modes:
    - CLOUD: Uses captured sessions, runs in background (production)
    - LOCAL: Connects to user's Chrome via CDP (testing/personal use)
    
    Features:
    - Checkpoint-based recovery
    - Parallel marketplace posting
    - Automatic retries
    - Error isolation (one failure doesn't stop others)
    """
    
    def __init__(self, mode: str = None):
        """
        Initialize job processor.
        
        Args:
            mode: "cloud" or "local" - defaults to BROWSER_MODE env var
        """
        self.mode = mode or os.getenv('BROWSER_MODE', 'cloud').lower()
        self.session_loader = SessionLoader()
        self.researcher = ResearcherAgent()
        
        logger.info(
            "JobProcessor initialized",
            mode=self.mode
        )
        
        # Platform-specific agents - initialized with mode
        self.agents = {
            'poshmark': PoshmarkListingAgent(mode=self.mode),
            'ebay': EbayListingAgent(mode=self.mode),
            'mercari': MercariListingAgent(mode=self.mode),
            'flyp': FlypCrosslisterAgent(mode=self.mode),
        }
    
    async def process(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a listing job end-to-end.
        
        Args:
            job_data: Job data with user_id, listing, marketplaces, job_id
        
        Returns:
            Results dictionary with success status and marketplace URLs
        """
        job_id = job_data['job_id']
        user_id = job_data['user_id']
        listing = job_data['listing']
        marketplaces = job_data['marketplaces']
        
        logger.info(
            "Processing job",
            job_id=job_id,
            user_id=user_id,
            marketplaces=marketplaces
        )
        
        # Initialize state manager for checkpointing
        state_manager = StateManager(job_id)
        
        # Try to resume from checkpoint
        state = await state_manager.load_checkpoint()
        
        if state:
            logger.info("Resuming from checkpoint", job_id=job_id, checkpoint=state)
        else:
            state = {
                'job_id': job_id,
                'current_step': 'start',
                'completed_platforms': [],
                'pending_platforms': marketplaces.copy(),
                'results': {},
                'started_at': datetime.utcnow().isoformat(),
            }
        
        try:
            # Step 1: Research and optimize listing
            # Skip if frontend already ran the smart analysis pipeline
            if state['current_step'] == 'start':
                has_frontend_research = (
                    listing.get('platformContent') and
                    listing.get('marketResearch')
                )
                
                if has_frontend_research:
                    logger.info(
                        "Step 1: Using frontend smart-analysis data (skipping re-research)",
                        job_id=job_id
                    )
                    # Build optimized listing from frontend data
                    optimized_listing = dict(listing)
                    platform_content = listing.get('platformContent', {})
                    
                    # Map frontend platformContent into the format agents expect
                    for mp in ['ebay', 'poshmark', 'mercari', 'flyp']:
                        if mp in platform_content:
                            pc = platform_content[mp]
                            optimized_listing[f'{mp}_title'] = pc.get('title', listing.get('title', ''))
                            optimized_listing[f'{mp}_description'] = pc.get('description', listing.get('description', ''))
                            optimized_listing[f'{mp}_hashtags'] = pc.get('hashtags', [])
                    
                    # Attach market research metadata
                    mr = listing.get('marketResearch')
                    if mr:
                        optimized_listing['market_research'] = mr
                        if mr.get('recommendedPrice'):
                            optimized_listing['suggested_price'] = mr['recommendedPrice']
                else:
                    logger.info("Step 1: Researching and optimizing listing", job_id=job_id)
                    optimized_listing = await self.researcher.analyze_and_optimize(listing)
                
                state['optimized_listing'] = optimized_listing
                state['current_step'] = 'research_complete'
                await state_manager.save_checkpoint(state)
                
                logger.info("Research complete", job_id=job_id)
            
            # Step 2: Load user sessions for each marketplace (cloud mode only)
            if 'sessions' not in state:
                logger.info(
                    "Step 2: Loading user sessions",
                    job_id=job_id,
                    mode=self.mode
                )
                
                sessions = {}
                
                # In local mode, we don't need sessions - browser already has cookies
                if self.mode == "local":
                    logger.info("Local mode - using existing browser sessions")
                    for marketplace in state['pending_platforms']:
                        sessions[marketplace] = {"mode": "local"}  # Placeholder
                else:
                    # Cloud mode - load captured sessions from database
                    for marketplace in state['pending_platforms']:
                        session = await self.session_loader.load_session(user_id, marketplace)
                        if session:
                            sessions[marketplace] = session
                        else:
                            logger.warning(
                                "No session found for marketplace",
                                marketplace=marketplace,
                                user_id=user_id
                            )
                            state['results'][marketplace] = {
                                'success': False,
                                'error': 'No session found - user needs to log in and sync via browser extension',
                            }
                            state['completed_platforms'].append(marketplace)
                            state['pending_platforms'].remove(marketplace)
                
                state['sessions'] = sessions
                state['current_step'] = 'sessions_loaded'
                await state_manager.save_checkpoint(state)
            
            # Step 3: Post to each marketplace in parallel
            optimized_listing = state.get('optimized_listing', listing)
            sessions = state.get('sessions', {})
            
            # Create tasks for all pending platforms
            tasks = []
            for marketplace in state['pending_platforms']:
                if marketplace in sessions:
                    task = self._create_listing_on_marketplace(
                        marketplace,
                        optimized_listing,
                        sessions[marketplace],
                        state_manager,
                        state
                    )
                    tasks.append(task)
            
            # Run all marketplace postings in parallel
            if tasks:
                logger.info(
                    "Step 3: Posting to marketplaces in parallel",
                    job_id=job_id,
                    count=len(tasks)
                )
                
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Process results
                for i, marketplace in enumerate(state['pending_platforms'].copy()):
                    if marketplace in sessions:
                        result = results[i] if i < len(results) else None
                        
                        if isinstance(result, Exception):
                            logger.error(
                                "Marketplace posting failed",
                                marketplace=marketplace,
                                error=str(result)
                            )
                            state['results'][marketplace] = {
                                'success': False,
                                'error': str(result),
                            }
                        else:
                            state['results'][marketplace] = result
                        
                        state['completed_platforms'].append(marketplace)
                        if marketplace in state['pending_platforms']:
                            state['pending_platforms'].remove(marketplace)
            
            # Final checkpoint
            state['current_step'] = 'completed'
            state['completed_at'] = datetime.utcnow().isoformat()
            await state_manager.save_checkpoint(state)
            
            # Calculate overall success
            successful_posts = sum(
                1 for r in state['results'].values()
                if r.get('success', False)
            )
            
            logger.info(
                "Job processing complete",
                job_id=job_id,
                successful=successful_posts,
                total=len(marketplaces)
            )
            
            return {
                'success': successful_posts > 0,
                'job_id': job_id,
                'results': state['results'],
                'successful_posts': successful_posts,
                'total_marketplaces': len(marketplaces),
                'completed_at': state['completed_at'],
            }
            
        except Exception as e:
            logger.error(
                "Job processing error",
                job_id=job_id,
                error=str(e),
                exc_info=True
            )
            
            # Save error state
            state['current_step'] = 'error'
            state['error'] = str(e)
            await state_manager.save_checkpoint(state)
            
            raise
    
    async def _create_listing_on_marketplace(
        self,
        marketplace: str,
        listing: Dict[str, Any],
        session: Dict[str, Any],
        state_manager: StateManager,
        state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create listing on a specific marketplace.
        
        This method runs in parallel with other marketplaces.
        """
        logger.info("Creating listing", marketplace=marketplace)
        
        try:
            agent = self.agents.get(marketplace)
            if not agent:
                raise ValueError(f"No agent for marketplace: {marketplace}")
            
            # Create listing using agent
            result = await agent.create_listing(listing, session)
            
            logger.info(
                "Listing created",
                marketplace=marketplace,
                success=result.get('success', False),
                url=result.get('url')
            )
            
            return result
            
        except Exception as e:
            logger.error(
                "Failed to create listing",
                marketplace=marketplace,
                error=str(e),
                exc_info=True
            )
            
            return {
                'success': False,
                'error': str(e),
                'marketplace': marketplace,
            }
