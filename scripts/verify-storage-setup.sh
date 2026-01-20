#!/bin/bash

# =====================================================
# Supabase Storage Setup Verification Script
# =====================================================
# This script helps verify that your storage is configured correctly

echo "🔍 Verifying Supabase Storage Setup..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ .env.local file not found${NC}"
    echo "   Create .env.local with your Supabase credentials"
    exit 1
else
    echo -e "${GREEN}✅ .env.local file exists${NC}"
fi

# Check if NEXT_PUBLIC_SUPABASE_URL is set
if grep -q "NEXT_PUBLIC_SUPABASE_URL=" .env.local; then
    SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d '=' -f2)
    if [ ! -z "$SUPABASE_URL" ]; then
        echo -e "${GREEN}✅ NEXT_PUBLIC_SUPABASE_URL is set${NC}"
    else
        echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_URL is empty${NC}"
    fi
else
    echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_URL not found in .env.local${NC}"
fi

# Check if NEXT_PUBLIC_SUPABASE_ANON_KEY is set
if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local; then
    ANON_KEY=$(grep "NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local | cut -d '=' -f2)
    if [ ! -z "$ANON_KEY" ]; then
        echo -e "${GREEN}✅ NEXT_PUBLIC_SUPABASE_ANON_KEY is set${NC}"
    else
        echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is empty${NC}"
    fi
else
    echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.local${NC}"
fi

echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Create Storage Bucket:"
echo "   • Go to your Supabase Dashboard"
echo "   • Navigate to Storage section"
echo "   • Create new bucket: 'listing-images'"
echo "   • Set as PUBLIC bucket"
echo ""
echo "2. Run SQL Migration:"
echo "   • Open Supabase SQL Editor"
echo "   • Copy contents from: supabase/migrations/002_storage_setup.sql"
echo "   • Paste and execute the SQL"
echo ""
echo "3. Test Storage:"
echo "   • Run your Next.js app: npm run dev"
echo "   • Go to /listings/new"
echo "   • Try uploading an image"
echo "   • Check Supabase Storage dashboard for uploaded files"
echo ""
echo "4. Verify Policies:"
echo "   • Go to Supabase Storage > listing-images > Policies"
echo "   • Ensure policies are created for:"
echo "     - Upload (authenticated users)"
echo "     - Read (public)"
echo "     - Delete (authenticated users)"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "   • Bucket MUST be named 'listing-images'"
echo "   • Bucket MUST be set to PUBLIC"
echo "   • SQL migration MUST be executed"
echo ""
echo "📚 For detailed instructions, see: docs/STORAGE_IMPLEMENTATION.md"
echo ""
