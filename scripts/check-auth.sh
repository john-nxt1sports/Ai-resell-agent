#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}🔍 Supabase Auth Diagnostic Tool${NC}"
echo -e "${BLUE}=================================${NC}\n"

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓${NC} Found .env.local file"
    
    # Check for required environment variables
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
        SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d '=' -f2)
        echo -e "${GREEN}✓${NC} NEXT_PUBLIC_SUPABASE_URL is set"
        echo -e "  ${YELLOW}→${NC} $SUPABASE_URL"
    else
        echo -e "${RED}✗${NC} NEXT_PUBLIC_SUPABASE_URL is missing"
    fi
    
    if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local; then
        echo -e "${GREEN}✓${NC} NEXT_PUBLIC_SUPABASE_ANON_KEY is set"
    else
        echo -e "${RED}✗${NC} NEXT_PUBLIC_SUPABASE_ANON_KEY is missing"
    fi
    
    if grep -q "NEXT_PUBLIC_APP_URL" .env.local; then
        APP_URL=$(grep "NEXT_PUBLIC_APP_URL" .env.local | cut -d '=' -f2)
        echo -e "${GREEN}✓${NC} NEXT_PUBLIC_APP_URL is set"
        echo -e "  ${YELLOW}→${NC} $APP_URL"
    else
        echo -e "${YELLOW}⚠${NC} NEXT_PUBLIC_APP_URL is not set (optional but recommended)"
    fi
else
    echo -e "${RED}✗${NC} .env.local file not found!"
    echo -e "${YELLOW}→${NC} Please create .env.local with your Supabase credentials"
    echo ""
    echo -e "Example .env.local:"
    echo -e "${BLUE}NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
    echo -e "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    echo -e "NEXT_PUBLIC_APP_URL=http://localhost:3000${NC}"
fi

echo ""
echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}📋 Setup Checklist${NC}"
echo -e "${BLUE}=================================${NC}\n"

echo "Complete these steps in your Supabase Dashboard:"
echo ""
echo "1. Run Database Setup:"
echo -e "   ${YELLOW}→${NC} Go to SQL Editor in Supabase Dashboard"
echo -e "   ${YELLOW}→${NC} Copy contents from supabase/setup.sql"
echo -e "   ${YELLOW}→${NC} Execute the SQL"
echo ""

echo "2. Configure Authentication:"
echo -e "   ${YELLOW}→${NC} Go to Authentication > Settings"
echo -e "   ${YELLOW}→${NC} For DEV: Disable 'Enable email confirmations'"
echo -e "   ${YELLOW}→${NC} For PROD: Keep it enabled and configure SMTP"
echo ""

echo "3. Set Site URL:"
echo -e "   ${YELLOW}→${NC} In Authentication > URL Configuration"
echo -e "   ${YELLOW}→${NC} Site URL: http://localhost:3000 (for dev)"
echo -e "   ${YELLOW}→${NC} Redirect URLs: http://localhost:3000/auth/callback"
echo ""

echo "4. Verify Database:"
echo -e "   ${YELLOW}→${NC} Go to Table Editor"
echo -e "   ${YELLOW}→${NC} Check that 'profiles' table exists"
echo -e "   ${YELLOW}→${NC} Check that triggers are created (Database > Triggers)"
echo ""

echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}🧪 Testing Instructions${NC}"
echo -e "${BLUE}=================================${NC}\n"

echo "After completing setup:"
echo ""
echo "1. Start your dev server:"
echo -e "   ${GREEN}npm run dev${NC}"
echo ""
echo "2. Clear browser cookies/cache"
echo ""
echo "3. Try signing up with a NEW email"
echo ""
echo "4. Check the browser console for errors"
echo ""
echo "5. If issues persist, check:"
echo -e "   ${YELLOW}→${NC} Supabase Dashboard > Logs"
echo -e "   ${YELLOW}→${NC} Browser Network tab for failed requests"
echo -e "   ${YELLOW}→${NC} docs/AUTH_SETUP_GUIDE.md for detailed help"
echo ""

echo -e "${BLUE}=================================${NC}"
echo -e "${GREEN}Need more help? Check:${NC}"
echo -e "  ${YELLOW}→${NC} docs/AUTH_SETUP_GUIDE.md"
echo -e "  ${YELLOW}→${NC} https://supabase.com/docs/guides/auth"
echo -e "${BLUE}=================================${NC}"
