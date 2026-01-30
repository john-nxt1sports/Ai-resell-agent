"""
State Manager - Checkpoint-based recovery system (2026 Best Practices)

Saves state after every step so jobs can resume from any point if worker crashes.
"""

import json
from typing import Dict, Any, Optional
from datetime import datetime
import structlog
from redis import Redis
import os

logger = structlog.get_logger()


class StateManager:
    """
    Manages job state with checkpoint-based recovery.
    
    Features:
    - Save checkpoint after each major step
    - Load checkpoint on worker restart
    - Resume exactly where job left off
    - Automatic expiration of old checkpoints
    """
    
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.redis = Redis.from_url(self.redis_url)
        self.state_key = f"job:{job_id}:state"
        self.ttl_seconds = 86400  # 24 hours
    
    async def save_checkpoint(self, state: Dict[str, Any]) -> None:
        """
        Save current job state as a checkpoint.
        
        Call this after completing each major step:
        - After research complete
        - After each marketplace posting
        - On completion
        - On error
        """
        try:
            # Add timestamp
            state['checkpoint_timestamp'] = datetime.utcnow().isoformat()
            
            # Serialize to JSON
            state_json = json.dumps(state)
            
            # Save to Redis with expiration
            self.redis.set(self.state_key, state_json, ex=self.ttl_seconds)
            
            logger.info(
                "Checkpoint saved",
                job_id=self.job_id,
                current_step=state.get('current_step'),
                completed_platforms=state.get('completed_platforms', [])
            )
            
        except Exception as e:
            logger.error(
                "Failed to save checkpoint",
                job_id=self.job_id,
                error=str(e),
                exc_info=True
            )
            # Don't raise - checkpoint failure shouldn't stop job
    
    async def load_checkpoint(self) -> Optional[Dict[str, Any]]:
        """
        Load checkpoint if exists.
        
        Returns None if no checkpoint exists (fresh start).
        Returns state dict if checkpoint exists (resume).
        """
        try:
            state_json = self.redis.get(self.state_key)
            
            if not state_json:
                logger.info("No checkpoint found - starting fresh", job_id=self.job_id)
                return None
            
            state = json.loads(state_json)
            
            logger.info(
                "Checkpoint loaded",
                job_id=self.job_id,
                current_step=state.get('current_step'),
                checkpoint_age_seconds=(
                    (datetime.utcnow() - datetime.fromisoformat(
                        state.get('checkpoint_timestamp', datetime.utcnow().isoformat())
                    )).total_seconds()
                )
            )
            
            return state
            
        except Exception as e:
            logger.error(
                "Failed to load checkpoint",
                job_id=self.job_id,
                error=str(e),
                exc_info=True
            )
            return None
    
    async def clear_checkpoint(self) -> None:
        """
        Clear checkpoint (call after job successfully completes).
        """
        try:
            self.redis.delete(self.state_key)
            logger.info("Checkpoint cleared", job_id=self.job_id)
        except Exception as e:
            logger.error(
                "Failed to clear checkpoint",
                job_id=self.job_id,
                error=str(e)
            )
    
    async def get_checkpoint_age(self) -> Optional[float]:
        """
        Get age of checkpoint in seconds.
        Returns None if no checkpoint exists.
        """
        try:
            state = await self.load_checkpoint()
            if not state:
                return None
            
            checkpoint_time = datetime.fromisoformat(
                state.get('checkpoint_timestamp', datetime.utcnow().isoformat())
            )
            age_seconds = (datetime.utcnow() - checkpoint_time).total_seconds()
            
            return age_seconds
            
        except Exception as e:
            logger.error("Failed to get checkpoint age", error=str(e))
            return None


class StateManagerFactory:
    """
    Factory for creating StateManager instances.
    Useful for testing with different Redis connections.
    """
    
    @staticmethod
    def create(job_id: str, redis_url: Optional[str] = None) -> StateManager:
        """Create a StateManager with optional custom Redis URL"""
        manager = StateManager(job_id)
        if redis_url:
            manager.redis = Redis.from_url(redis_url)
        return manager
