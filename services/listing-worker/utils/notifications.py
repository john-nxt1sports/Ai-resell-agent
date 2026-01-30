"""
Notification Service - Send notifications to users (2026 Best Practices)
"""

from typing import Dict, Any
import structlog
import os
import httpx

logger = structlog.get_logger()


class NotificationService:
    """
    Sends notifications to users via multiple channels.
    
    Channels:
    - Webhook (to Next.js backend)
    - Email (future)
    - Push notifications (future)
    """
    
    def __init__(self):
        self.backend_url = os.getenv('NEXT_PUBLIC_API_URL', 'http://localhost:3000')
        self.webhook_enabled = os.getenv('NOTIFICATIONS_WEBHOOK_ENABLED', 'true') == 'true'
    
    async def send_completion_notification(
        self,
        user_id: str,
        job_id: str,
        listing: Dict[str, Any],
        results: Dict[str, Any]
    ) -> None:
        """
        Notify user that their listing job completed.
        
        This updates the database and can trigger in-app notifications.
        """
        try:
            if not self.webhook_enabled:
                logger.info("Webhook notifications disabled", job_id=job_id)
                return
            
            # Prepare notification payload
            successful_platforms = [
                platform for platform, result in results.get('results', {}).items()
                if result.get('success', False)
            ]
            
            payload = {
                'type': 'job_completed',
                'job_id': job_id,
                'user_id': user_id,
                'listing_title': listing.get('title', 'Unknown'),
                'successful_platforms': successful_platforms,
                'total_platforms': len(results.get('results', {})),
                'results': results,
            }
            
            # Send webhook
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f'{self.backend_url}/api/jobs/webhook',
                    json=payload,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    logger.info(
                        "Completion notification sent",
                        job_id=job_id,
                        user_id=user_id
                    )
                else:
                    logger.warning(
                        "Completion notification failed",
                        job_id=job_id,
                        status=response.status_code
                    )
                    
        except Exception as e:
            logger.error(
                "Failed to send completion notification",
                job_id=job_id,
                error=str(e),
                exc_info=True
            )
    
    async def send_failure_notification(
        self,
        user_id: str,
        job_id: str,
        listing: Dict[str, Any],
        error: str
    ) -> None:
        """
        Notify user that their listing job failed.
        """
        try:
            if not self.webhook_enabled:
                return
            
            payload = {
                'type': 'job_failed',
                'job_id': job_id,
                'user_id': user_id,
                'listing_title': listing.get('title', 'Unknown'),
                'error': error,
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f'{self.backend_url}/api/jobs/webhook',
                    json=payload,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    logger.info(
                        "Failure notification sent",
                        job_id=job_id,
                        user_id=user_id
                    )
                    
        except Exception as e:
            logger.error(
                "Failed to send failure notification",
                job_id=job_id,
                error=str(e)
            )
    
    async def send_progress_update(
        self,
        user_id: str,
        job_id: str,
        marketplace: str,
        status: str,
        progress: int
    ) -> None:
        """
        Send real-time progress update (for WebSocket).
        """
        try:
            if not self.webhook_enabled:
                return
            
            payload = {
                'type': 'job_progress',
                'job_id': job_id,
                'user_id': user_id,
                'marketplace': marketplace,
                'status': status,
                'progress': progress,
            }
            
            async with httpx.AsyncClient() as client:
                await client.post(
                    f'{self.backend_url}/api/jobs/webhook',
                    json=payload,
                    timeout=5.0
                )
                
        except Exception as e:
            logger.debug(
                "Progress update failed (non-critical)",
                job_id=job_id,
                error=str(e)
            )
