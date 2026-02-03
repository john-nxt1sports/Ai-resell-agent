"""
Autonomous Cross-Listing Worker - Main Entry Point (2026 Best Practices)

This worker processes listing jobs from Redis queue and uses browser-use
to autonomously post listings to multiple marketplaces.

User can close their browser - this keeps running in the cloud.
"""

import asyncio
import os
import sys
from typing import Dict, Any
import structlog
from dotenv import load_dotenv

# Import Redis and job queue
from redis import Redis
from rq import Worker, Queue

# Import our modules
from orchestrator.job_processor import JobProcessor
from utils.metrics import MetricsTracker
from utils.notifications import NotificationService

# Load environment variables
load_dotenv()

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


class ListingWorker:
    """
    Main worker class that processes listing jobs autonomously.
    
    Features:
    - Runs 24/7 in the cloud
    - User can close their browser - worker continues
    - Uses browser-use with cloud browsers
    - Automatic retries and error handling
    - State checkpointing for recovery
    """
    
    def __init__(self):
        self.redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.redis = Redis.from_url(self.redis_url)
        self.queue = Queue('listings', connection=self.redis)
        self.job_processor = JobProcessor()
        self.metrics = MetricsTracker(self.redis)
        self.notifications = NotificationService()
        
        logger.info("ListingWorker initialized", redis_url=self.redis_url)
    
    async def process_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a single listing job autonomously.
        
        This method runs even if user closes their browser.
        It coordinates all agents and handles the full listing flow.
        
        Args:
            job_data: Job data containing:
                - user_id: User ID
                - listing: Listing data (title, description, images, etc.)
                - marketplaces: List of marketplaces to post to
                - job_id: Unique job ID
        
        Returns:
            Dictionary with results for each marketplace
        """
        job_id = job_data.get('job_id', 'unknown')
        user_id = job_data.get('user_id')
        listing = job_data.get('listing', {})
        marketplaces = job_data.get('marketplaces', [])
        
        logger.info(
            "Processing job",
            job_id=job_id,
            user_id=user_id,
            marketplaces=marketplaces,
            listing_title=listing.get('title', 'Unknown')
        )
        
        try:
            # Use JobProcessor to handle the job
            results = await self.job_processor.process(job_data)
            
            # Track metrics
            await self.metrics.record_job_completion(
                job_id=job_id,
                user_id=user_id,
                success=results.get('success', False),
                marketplaces=marketplaces
            )
            
            # Send completion notification to user
            await self.notifications.send_completion_notification(
                user_id=user_id,
                job_id=job_id,
                listing=listing,
                results=results
            )
            
            logger.info(
                "Job completed",
                job_id=job_id,
                success=results.get('success', False),
                results=results
            )
            
            return results
            
        except Exception as e:
            logger.error(
                "Job processing failed",
                job_id=job_id,
                error=str(e),
                exc_info=True
            )
            
            # Track failure
            await self.metrics.record_job_failure(
                job_id=job_id,
                user_id=user_id,
                error=str(e)
            )
            
            # Notify user of failure
            await self.notifications.send_failure_notification(
                user_id=user_id,
                job_id=job_id,
                listing=listing,
                error=str(e)
            )
            
            return {
                'success': False,
                'error': str(e),
                'job_id': job_id
            }
    
    def run(self):
        """
        Start the worker to process jobs from the queue.
        
        This runs indefinitely, processing jobs as they arrive.
        """
        logger.info("Starting worker...")
        
        worker = Worker([self.queue], connection=self.redis, log_job_description=True)
        worker.work(with_scheduler=True)


def main():
    """Main entry point"""
    logger.info("Starting Listing Worker Service (2026 Best Practices)")
    
    # Validate required environment variables
    required_env_vars = [
        'REDIS_URL',
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'OPENROUTER_API_KEY'
    ]
    
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    if missing_vars:
        logger.error(
            "Missing required environment variables",
            missing_vars=missing_vars
        )
        sys.exit(1)
    
    # Create and run worker
    worker = ListingWorker()
    
    try:
        worker.run()
    except KeyboardInterrupt:
        logger.info("Worker stopped by user")
    except Exception as e:
        logger.error("Worker crashed", error=str(e), exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
