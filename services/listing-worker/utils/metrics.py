"""
Metrics Tracker - Track job performance and success rates (2026 Best Practices)
"""

from typing import List, Dict, Any
import structlog
from redis import Redis
from datetime import datetime, timedelta
import json

logger = structlog.get_logger()


class MetricsTracker:
    """
    Tracks worker metrics for monitoring and analytics.
    
    Metrics tracked:
    - Job success/failure rates
    - Average processing time
    - Marketplace-specific success rates
    - Error patterns
    """
    
    def __init__(self, redis: Redis):
        self.redis = redis
    
    async def record_job_completion(
        self,
        job_id: str,
        user_id: str,
        success: bool,
        marketplaces: List[str],
        duration_seconds: float = 0
    ) -> None:
        """Record successful job completion"""
        try:
            # Increment success counter
            self.redis.incr('metrics:jobs:completed')
            
            if success:
                self.redis.incr('metrics:jobs:successful')
            
            # Track per-marketplace success
            for marketplace in marketplaces:
                self.redis.incr(f'metrics:marketplace:{marketplace}:attempts')
                if success:
                    self.redis.incr(f'metrics:marketplace:{marketplace}:successes')
            
            # Store detailed metric
            metric = {
                'job_id': job_id,
                'user_id': user_id,
                'success': success,
                'marketplaces': marketplaces,
                'duration_seconds': duration_seconds,
                'timestamp': datetime.utcnow().isoformat(),
            }
            
            # Add to time-series list (keep last 1000)
            self.redis.lpush('metrics:job_history', json.dumps(metric))
            self.redis.ltrim('metrics:job_history', 0, 999)
            
            logger.info(
                "Metrics recorded",
                job_id=job_id,
                success=success,
                duration_seconds=duration_seconds
            )
            
        except Exception as e:
            logger.error("Failed to record metrics", error=str(e))
    
    async def record_job_failure(
        self,
        job_id: str,
        user_id: str,
        error: str
    ) -> None:
        """Record job failure"""
        try:
            self.redis.incr('metrics:jobs:failed')
            
            # Track error patterns
            error_key = f'metrics:errors:{error[:50]}'
            self.redis.incr(error_key)
            self.redis.expire(error_key, 86400)  # 24 hours
            
            logger.info("Failure metrics recorded", job_id=job_id, error=error)
            
        except Exception as e:
            logger.error("Failed to record failure metrics", error=str(e))
    
    async def get_success_rate(self) -> float:
        """Get overall job success rate"""
        try:
            total = int(self.redis.get('metrics:jobs:completed') or 0)
            successful = int(self.redis.get('metrics:jobs:successful') or 0)
            
            if total == 0:
                return 0.0
            
            return (successful / total) * 100
            
        except Exception as e:
            logger.error("Failed to get success rate", error=str(e))
            return 0.0
    
    async def get_marketplace_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get per-marketplace statistics"""
        try:
            marketplaces = ['poshmark', 'ebay', 'mercari']
            stats = {}
            
            for marketplace in marketplaces:
                attempts = int(self.redis.get(
                    f'metrics:marketplace:{marketplace}:attempts'
                ) or 0)
                successes = int(self.redis.get(
                    f'metrics:marketplace:{marketplace}:successes'
                ) or 0)
                
                success_rate = (successes / attempts * 100) if attempts > 0 else 0
                
                stats[marketplace] = {
                    'attempts': attempts,
                    'successes': successes,
                    'success_rate': success_rate,
                }
            
            return stats
            
        except Exception as e:
            logger.error("Failed to get marketplace stats", error=str(e))
            return {}
