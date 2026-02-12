"""
Autonomous Cross-Listing Worker - Main Entry Point (2026 Best Practices)

This worker processes listing jobs from Redis queue and uses browser-use
to autonomously post listings to multiple marketplaces.

Consumes jobs from queue:listings (BRPOP pattern matching the TypeScript frontend).
"""

import asyncio
import json
import os
import sys
import ssl
import certifi
from typing import Dict, Any
import structlog
from dotenv import load_dotenv
from redis import Redis

# Load environment variables FIRST
load_dotenv()

# Fix macOS SSL for browser-use extension downloads
os.environ.setdefault("SSL_CERT_FILE", certifi.where())

# Import our modules
from orchestrator.job_processor import JobProcessor

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.dev.ConsoleRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Queue name matching the TypeScript frontend (lib/queue/listings-queue.ts)
QUEUE_KEY = "queue:listings"
PROCESSING_KEY = "queue:processing"  # Jobs currently being worked on
JOB_KEY_PREFIX = "job:"


class ListingWorker:
    """
    Main worker class that processes listing jobs autonomously.
    
    Consumes from queue:listings using BRPOP (matching the TypeScript
    frontend's LPUSH). This is a simple, reliable queue pattern that
    works without RQ/Bull dependencies.
    """
    
    def __init__(self):
        self.redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.redis = Redis.from_url(self.redis_url, decode_responses=True)
        self.job_processor = JobProcessor()
        
        # Recover any jobs stuck in processing queue from previous crash
        self._recover_stuck_jobs()
        
        logger.info("ListingWorker initialized", redis_url=self.redis_url, mode=self.job_processor.mode)
    
    def _recover_stuck_jobs(self):
        """Move any jobs stuck in processing queue back to main queue."""
        try:
            stuck_jobs = self.redis.lrange(PROCESSING_KEY, 0, -1)
            if stuck_jobs:
                logger.info("Recovering stuck jobs from previous run", count=len(stuck_jobs))
                for job in stuck_jobs:
                    # Push back to front of main queue (LPUSH = high priority)
                    self.redis.lpush(QUEUE_KEY, job)
                # Clear processing queue
                self.redis.delete(PROCESSING_KEY)
        except Exception as e:
            logger.error("Failed to recover stuck jobs", error=str(e))
    
    def _remove_from_processing(self, raw_job: str):
        """Remove a job from the processing queue after completion."""
        try:
            self.redis.lrem(PROCESSING_KEY, 1, raw_job)
        except Exception as e:
            logger.error("Failed to remove job from processing queue", error=str(e))
    
    def _update_job_status(self, job_id: str, status: str, result: Dict = None, error: str = None):
        """Update job status in Redis (readable by frontend via getJobStatus)."""
        try:
            existing = self.redis.get(f"{JOB_KEY_PREFIX}{job_id}")
            job_data = json.loads(existing) if existing else {}
            
            job_data["status"] = status
            if result:
                job_data["result"] = result
                job_data["progress"] = 100 if result.get("success") else job_data.get("progress", 0)
            if error:
                job_data["error"] = error
            
            self.redis.setex(
                f"{JOB_KEY_PREFIX}{job_id}",
                86400 * 7,  # 7 days TTL
                json.dumps(job_data)
            )
        except Exception as e:
            logger.error("Failed to update job status", job_id=job_id, error=str(e))
    
    async def process_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a single listing job autonomously.
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
        
        self._update_job_status(job_id, "processing")
        
        try:
            results = await self.job_processor.process(job_data)
            
            self._update_job_status(job_id, "completed", result=results)
            
            logger.info(
                "Job completed",
                job_id=job_id,
                success=results.get('success', False),
            )
            
            return results
            
        except Exception as e:
            logger.error(
                "Job processing failed",
                job_id=job_id,
                error=str(e),
                exc_info=True
            )
            
            self._update_job_status(job_id, "failed", error=str(e))
            
            return {
                'success': False,
                'error': str(e),
                'job_id': job_id
            }
    
    def run(self):
        """
        Start the worker — blocks forever, processing jobs as they arrive.
        
        Uses BRPOPLPUSH to atomically move jobs from queue:listings to queue:processing.
        Jobs stay in processing queue until completed, so they can be recovered on crash.
        """
        logger.info(
            "Worker started — waiting for jobs...",
            queue=QUEUE_KEY,
            mode=self.job_processor.mode
        )
        
        while True:
            try:
                # BRPOPLPUSH atomically moves job from main queue to processing queue
                # Job stays in processing queue until we explicitly remove it after completion
                raw_job = self.redis.brpoplpush(QUEUE_KEY, PROCESSING_KEY, timeout=5)
                
                if raw_job is None:
                    continue  # Timeout, loop back
                
                try:
                    job_envelope = json.loads(raw_job)
                    # The frontend wraps job_data inside { id, data, timestamp, ... }
                    job_data = job_envelope.get("data", job_envelope)
                    
                    logger.info(
                        "Received job from queue",
                        job_id=job_data.get("job_id", "unknown"),
                        title=job_data.get("listing", {}).get("title", "Unknown")
                    )
                    
                    # Run async job processor
                    asyncio.run(self.process_job(job_data))
                    
                    # Job completed (success or failure) - remove from processing queue
                    self._remove_from_processing(raw_job)
                    
                except json.JSONDecodeError as e:
                    logger.error("Invalid job data in queue", error=str(e), raw=raw_job[:200])
                    # Remove invalid job from processing queue
                    self._remove_from_processing(raw_job)
                except Exception as e:
                    logger.error("Failed to process job", error=str(e), exc_info=True)
                    # Keep in processing queue for recovery on restart
                    
            except KeyboardInterrupt:
                logger.info("Worker stopped by user")
                break
            except Exception as e:
                logger.error("Worker error", error=str(e), exc_info=True)
                # Brief pause before retrying
                import time
                time.sleep(2)


def main():
    """Main entry point"""
    logger.info("Starting Listing Worker Service")
    
    # Validate required environment variables
    required_env_vars = ['OPENROUTER_API_KEY']
    
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    if missing_vars:
        logger.error("Missing required environment variables", missing_vars=missing_vars)
        sys.exit(1)
    
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
