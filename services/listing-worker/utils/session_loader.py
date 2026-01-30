"""
Session Loader - Loads user marketplace sessions from database (2026 Best Practices)

Retrieves encrypted session data and prepares it for browser-use cloud browsers.
"""

import os
from typing import Dict, Any, Optional
import structlog
from supabase import create_client, Client

logger = structlog.get_logger()


class SessionLoader:
    """
    Loads user sessions from Supabase database.
    
    These sessions were captured by the browser extension
    and stored encrypted in the database.
    """
    
    def __init__(self):
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")
        
        self.supabase: Client = create_client(supabase_url, supabase_key)
    
    async def load_session(
        self,
        user_id: str,
        marketplace: str
    ) -> Optional[Dict[str, Any]]:
        """
        Load session data for a user and marketplace.
        
        Args:
            user_id: User ID
            marketplace: Marketplace name (poshmark, ebay, mercari)
        
        Returns:
            Session data dict with:
            - marketplace: Marketplace name
            - browser_profile_id: Cloud browser profile ID
            - encrypted_cookies: Encrypted cookie data
            - encrypted_storage: Encrypted localStorage/sessionStorage
            - expires_at: Session expiration time
        """
        try:
            logger.info(
                "Loading session",
                user_id=user_id,
                marketplace=marketplace
            )
            
            # Query session from database
            response = self.supabase.table('user_marketplace_sessions') \
                .select('*') \
                .eq('user_id', user_id) \
                .eq('marketplace', marketplace) \
                .single() \
                .execute()
            
            if not response.data:
                logger.warning(
                    "Session not found",
                    user_id=user_id,
                    marketplace=marketplace
                )
                return None
            
            session = response.data
            
            # Check if session is expired
            from datetime import datetime
            if session.get('expires_at'):
                expires_at = datetime.fromisoformat(
                    session['expires_at'].replace('Z', '+00:00')
                )
                if expires_at < datetime.utcnow():
                    logger.warning(
                        "Session expired",
                        user_id=user_id,
                        marketplace=marketplace,
                        expired_at=expires_at.isoformat()
                    )
                    return None
            
            logger.info(
                "Session loaded successfully",
                user_id=user_id,
                marketplace=marketplace,
                browser_profile_id=session.get('browser_profile_id')
            )
            
            return {
                'marketplace': session['marketplace'],
                'browser_profile_id': session['browser_profile_id'],
                'encrypted_cookies': session['encrypted_cookies'],
                'encrypted_storage': session.get('encrypted_storage'),
                'expires_at': session.get('expires_at'),
                'last_validated_at': session.get('last_validated_at'),
            }
            
        except Exception as e:
            logger.error(
                "Failed to load session",
                user_id=user_id,
                marketplace=marketplace,
                error=str(e),
                exc_info=True
            )
            return None
    
    async def load_all_sessions(
        self,
        user_id: str
    ) -> Dict[str, Dict[str, Any]]:
        """
        Load all sessions for a user.
        
        Returns:
            Dictionary mapping marketplace name to session data
        """
        try:
            logger.info("Loading all sessions", user_id=user_id)
            
            response = self.supabase.table('user_marketplace_sessions') \
                .select('*') \
                .eq('user_id', user_id) \
                .execute()
            
            sessions = {}
            for session_data in response.data:
                marketplace = session_data['marketplace']
                
                # Check expiration
                from datetime import datetime
                if session_data.get('expires_at'):
                    expires_at = datetime.fromisoformat(
                        session_data['expires_at'].replace('Z', '+00:00')
                    )
                    if expires_at < datetime.utcnow():
                        logger.warning(
                            "Skipping expired session",
                            marketplace=marketplace
                        )
                        continue
                
                sessions[marketplace] = {
                    'marketplace': marketplace,
                    'browser_profile_id': session_data['browser_profile_id'],
                    'encrypted_cookies': session_data['encrypted_cookies'],
                    'encrypted_storage': session_data.get('encrypted_storage'),
                    'expires_at': session_data.get('expires_at'),
                    'last_validated_at': session_data.get('last_validated_at'),
                }
            
            logger.info(
                "Loaded sessions",
                user_id=user_id,
                count=len(sessions),
                marketplaces=list(sessions.keys())
            )
            
            return sessions
            
        except Exception as e:
            logger.error(
                "Failed to load all sessions",
                user_id=user_id,
                error=str(e),
                exc_info=True
            )
            return {}
    
    async def validate_session(
        self,
        user_id: str,
        marketplace: str
    ) -> bool:
        """
        Check if a session exists and is valid.
        
        Returns:
            True if session exists and is not expired, False otherwise
        """
        session = await self.load_session(user_id, marketplace)
        return session is not None
