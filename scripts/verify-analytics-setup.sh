#!/bin/bash

# =====================================================
# Historical Analytics Setup Verification Script
# =====================================================

echo "🔍 Verifying Historical Analytics Setup..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if migrations exist
echo "📄 Checking SQL Migrations..."
if [ -f "supabase/migrations/003_analytics_historical.sql" ]; then
    echo -e "${GREEN}✅ Migration 003_analytics_historical.sql found${NC}"
else
    echo -e "${RED}❌ Migration 003_analytics_historical.sql missing${NC}"
fi

if [ -f "supabase/migrations/004_refresh_views_function.sql" ]; then
    echo -e "${GREEN}✅ Migration 004_refresh_views_function.sql found${NC}"
else
    echo -e "${RED}❌ Migration 004_refresh_views_function.sql missing${NC}"
fi

echo ""

# Check if lib files exist
echo "📚 Checking Library Files..."
if [ -f "lib/database/events.ts" ]; then
    echo -e "${GREEN}✅ lib/database/events.ts found${NC}"
else
    echo -e "${RED}❌ lib/database/events.ts missing${NC}"
fi

if [ -f "lib/database/historical.ts" ]; then
    echo -e "${GREEN}✅ lib/database/historical.ts found${NC}"
else
    echo -e "${RED}❌ lib/database/historical.ts missing${NC}"
fi

if [ -f "lib/hooks/useAnalytics.ts" ]; then
    echo -e "${GREEN}✅ lib/hooks/useAnalytics.ts found${NC}"
else
    echo -e "${RED}❌ lib/hooks/useAnalytics.ts missing${NC}"
fi

echo ""

# Check if edge function exists
echo "⚡ Checking Edge Function..."
if [ -f "supabase/functions/aggregate-daily-metrics/index.ts" ]; then
    echo -e "${GREEN}✅ Edge function found${NC}"
else
    echo -e "${RED}❌ Edge function missing${NC}"
fi

echo ""

# Check if documentation exists
echo "📖 Checking Documentation..."
if [ -f "docs/HISTORICAL_ANALYTICS.md" ]; then
    echo -e "${GREEN}✅ Documentation found${NC}"
else
    echo -e "${RED}❌ Documentation missing${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Run SQL Migrations:"
echo "   • Open Supabase SQL Editor"
echo "   • Execute: supabase/migrations/003_analytics_historical.sql"
echo "   • Execute: supabase/migrations/004_refresh_views_function.sql"
echo ""
echo "2. Deploy Edge Function:"
echo "   • Run: supabase functions deploy aggregate-daily-metrics"
echo ""
echo "3. Set Up Cron Job:"
echo "   • Go to Supabase Dashboard → Database → Cron Jobs"
echo "   • Create job to run daily at 1 AM UTC"
echo "   • See docs/HISTORICAL_ANALYTICS.md for SQL"
echo ""
echo "4. Test Event Logging:"
echo "   • Import: import { logView } from '@/lib/database';"
echo "   • Test: await logView(userId, listingId, 'poshmark');"
echo ""
echo "5. Test Analytics Hook:"
echo "   • Import: import { useAnalytics } from '@/lib/hooks/useAnalytics';"
echo "   • Use in component - see examples in docs"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "   • Migrations MUST be run before using the system"
echo "   • Edge function MUST be deployed for daily aggregation"
echo "   • Cron job MUST be set up for automatic updates"
echo ""
echo "📚 Full Guide: docs/HISTORICAL_ANALYTICS.md"
echo "📚 Setup Complete: docs/ANALYTICS_IMPLEMENTATION_COMPLETE.md"
echo ""
