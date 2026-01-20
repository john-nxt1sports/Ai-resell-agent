# 🗄️ Complete Database Guide - AI Resell Agent

## 📍 Database Location & Type

### **Database Provider**: Supabase (PostgreSQL)

- **Type**: Cloud-hosted PostgreSQL database
- **Access**: Via Supabase client libraries
- **Connection Files**:
  - Client-side: `/lib/supabase/client.ts`
  - Server-side: `/lib/supabase/server.ts`
  - Middleware: `/lib/supabase/middleware.ts`

### **Setup Files**:

- **Main Schema**: `/supabase/setup.sql` (317 lines)
- **Migrations**: `/supabase/migrations/delete_user_function.sql`

---

## 🏗️ Database Architecture Overview

Your app uses **Supabase** which is a PostgreSQL database with:

- **Authentication** (built-in auth system)
- **Row Level Security (RLS)** for data protection
- **Storage** for images (separate from main database)
- **Real-time subscriptions** (optional feature)

---

## 📊 Complete Table Breakdown

### 1. **`profiles`** Table (User Management)

Extends Supabase's built-in authentication to store user profile data.

**Location**: `public.profiles`

**Structure**:

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,                    -- Links to auth.users(id)
  email TEXT UNIQUE NOT NULL,             -- User email
  full_name TEXT,                         -- Display name
  avatar_url TEXT,                        -- Profile picture URL
  plan_type TEXT DEFAULT 'starter',       -- starter | professional | enterprise
  trial_ends_at TIMESTAMP,                -- When trial expires
  subscription_status TEXT DEFAULT 'trial', -- trial | active | cancelled | expired
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose**:

- Stores user account information
- Tracks subscription plans and trial periods
- Links to all other user-related data

**Relationships**:

- `id` → Foreign key to `auth.users(id)` (Supabase auth table)
- Referenced by: `listings`, `marketplace_connections`, `analytics`, `ai_generations`, `support_tickets`

**Access Rules** (RLS):

- Users can only view/edit their own profile
- Auto-created when user signs up (via trigger)

**Current State**:

- Currently, your app uses **Zustand store** (`listingStore.ts`) for demo data
- Real production app would query this table for user data

---

### 2. **`listings`** Table (Core Product Data)

Stores all product listings created by users.

**Location**: `public.listings`

**Structure**:

```sql
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                   -- Product title
  description TEXT,                      -- Product description (often AI-generated)
  price DECIMAL(10, 2),                 -- Price in USD
  category TEXT,                         -- e.g., "Shoes", "Electronics"
  condition TEXT,                        -- new | like_new | good | fair | poor
  brand TEXT,                            -- e.g., "Nike", "Apple"
  size TEXT,                             -- Product size
  color TEXT,                            -- Product color
  tags TEXT[],                          -- Array of tags (AI-generated)
  images TEXT[],                        -- Array of image URLs
  ai_generated BOOLEAN DEFAULT false,    -- Whether AI created this
  status TEXT DEFAULT 'draft',           -- draft | published | sold | archived
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose**:

- Main storage for all product listings
- Contains both user-entered and AI-generated data
- Tracks listing lifecycle (draft → published → sold)

**Relationships**:

- `user_id` → Links to `profiles(id)`
- Referenced by: `marketplace_listings`, `analytics`, `ai_generations`

**Indexes** (for fast queries):

- `idx_listings_user_id` - Find all listings by user
- `idx_listings_status` - Find listings by status
- `idx_listings_created_at` - Sort by creation date

**Access Rules** (RLS):

- Users can only view/edit/delete their own listings
- Automatic deletion when user is deleted (CASCADE)

**How Your App Uses It**:

```typescript
// From NewListing.tsx (line ~426)
// Currently stores in Zustand (demo), should store in database:
addListing({
  title,
  price: parseFloat(price),
  images: imageUrls,
  marketplaces: selectedMarketplaces,
  status: "processing",
});
```

**Real Implementation**:

```typescript
const { data, error } = await supabase.from("listings").insert({
  user_id: user.id,
  title: title,
  description: description,
  price: parseFloat(price),
  category: category,
  condition: condition,
  brand: brand,
  images: uploadedImageUrls,
  ai_generated: true,
  status: "published",
});
```

---

### 3. **`marketplace_listings`** Table (Cross-Platform Tracking)

Tracks where each listing has been posted (eBay, Poshmark, Mercari).

**Location**: `public.marketplace_listings`

**Structure**:

```sql
CREATE TABLE public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,             -- ebay | poshmark | mercari
  marketplace_listing_id TEXT,           -- ID from external marketplace
  marketplace_url TEXT,                  -- Direct URL to listing
  posted_at TIMESTAMP,                   -- When posted
  views INTEGER DEFAULT 0,               -- View count
  likes INTEGER DEFAULT 0,               -- Like/favorite count
  status TEXT DEFAULT 'active',          -- active | sold | removed | expired
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose**:

- One listing can be posted to multiple marketplaces
- Tracks performance on each platform
- Stores external marketplace IDs and URLs

**Relationships**:

- `listing_id` → Links to `listings(id)`
- Unique constraint: One listing per marketplace

**Example Data**:

```
listing_id: abc-123
├── marketplace: "ebay"
│   └── marketplace_url: "https://ebay.com/item/xyz"
├── marketplace: "poshmark"
│   └── marketplace_url: "https://poshmark.com/listing/xyz"
└── marketplace: "mercari"
    └── marketplace_url: "https://mercari.com/us/item/xyz"
```

**Access Rules** (RLS):

- Users can only view marketplace listings for their own listings

---

### 4. **`marketplace_connections`** Table (OAuth Integration)

Stores connection status and tokens for external marketplaces.

**Location**: `public.marketplace_connections`

**Structure**:

```sql
CREATE TABLE public.marketplace_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,             -- ebay | poshmark | mercari
  access_token TEXT,                     -- OAuth access token
  refresh_token TEXT,                    -- OAuth refresh token
  is_connected BOOLEAN DEFAULT false,    -- Connection status
  last_synced_at TIMESTAMP,              -- Last data sync
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, marketplace)
);
```

**Purpose**:

- Stores OAuth credentials for posting to marketplaces
- Tracks connection status
- One row per user per marketplace

**Security**:

- Tokens should be encrypted at rest
- RLS ensures users only see their own tokens

**Current State**:

- Your app has UI for marketplace selection but doesn't store connections yet

---

### 5. **`analytics`** Table (Performance Metrics)

Tracks detailed metrics for each listing across marketplaces.

**Location**: `public.analytics`

**Structure**:

```sql
CREATE TABLE public.analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  marketplace TEXT,                      -- ebay | poshmark | mercari
  metric_type TEXT NOT NULL,             -- view | like | share | sale
  metric_value INTEGER DEFAULT 1,        -- Count/amount
  recorded_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose**:

- Time-series data for analytics dashboard
- Tracks individual events (not aggregates)
- Can generate reports and graphs

**Example Data**:

```
2025-10-15 10:00 | listing: abc-123 | ebay | view   | 1
2025-10-15 10:05 | listing: abc-123 | ebay | like   | 1
2025-10-15 10:30 | listing: abc-123 | ebay | sale   | 249.99
```

**Indexes**:

- Optimized for date-range queries
- Fast lookup by user or listing

**How to Query**:

```typescript
// Get total views for a listing
const { data } = await supabase
  .from("analytics")
  .select("metric_value")
  .eq("listing_id", listingId)
  .eq("metric_type", "view")
  .sum("metric_value");
```

---

### 6. **`ai_generations`** Table (AI Usage Tracking)

Logs every AI generation for billing and debugging.

**Location**: `public.ai_generations`

**Structure**:

```sql
CREATE TABLE public.ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  generation_type TEXT NOT NULL,         -- title | description | tags | pricing
  input_data JSONB,                      -- What user provided
  output_data JSONB,                     -- What AI generated
  tokens_used INTEGER,                   -- OpenAI token count
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose**:

- Track AI API usage for billing
- Debug AI generations
- Analyze AI performance

**Example Data**:

```json
{
  "generation_type": "description",
  "input_data": {
    "category": "Shoes",
    "condition": "Like New",
    "brand": "Nike"
  },
  "output_data": {
    "description": "Premium Nike Air Jordan 1...",
    "tags": ["sneakers", "basketball", "retro"]
  },
  "tokens_used": 150
}
```

**How Your App Uses It**:

```typescript
// From app/api/ai/generate-listing/route.ts (line ~52)
await supabase.from("ai_generations").insert({
  user_id: user.id,
  generation_type: "listing",
  input_data: body,
  output_data: generatedData,
  tokens_used: estimatedTokens,
});
```

---

### 7. **`support_tickets`** Table (Customer Support)

Stores customer support requests.

**Location**: `public.support_tickets`

**Structure**:

```sql
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT NOT NULL,                -- general | technical | billing | feature | bug | account
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open',            -- open | in_progress | resolved | closed
  priority TEXT DEFAULT 'normal',        -- low | normal | high | urgent
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose**:

- Help desk / support system
- Track user issues
- Prioritize and resolve tickets

---

## 🖼️ Image Storage (Separate from Tables)

### **Supabase Storage Bucket**: `listing-images`

**Location**: `/lib/storage.ts`

**How It Works**:

```typescript
// Upload image
const { data, error } = await supabase.storage
  .from("listing-images")
  .upload(`${userId}/${Date.now()}-${filename}`, file);

// Get public URL
const {
  data: { publicUrl },
} = supabase.storage.from("listing-images").getPublicUrl(data.path);
```

**Storage Structure**:

```
listing-images/
├── user-id-1/
│   ├── 1729000000-abc123.jpg
│   ├── 1729000001-def456.jpg
│   └── ...
└── user-id-2/
    ├── 1729000002-ghi789.jpg
    └── ...
```

**In Database**:

- URLs stored as `TEXT[]` array in `listings.images` column
- Example: `["https://xyz.supabase.co/storage/v1/object/public/listing-images/user-123/image.jpg"]`

**Current Implementation**:

- Your `NewListing.tsx` calls `uploadImages()` function
- Images uploaded to Supabase Storage
- URLs stored in state for submission

---

## 🔐 Security (Row Level Security)

### How RLS Works:

Every query automatically checks: "Does this user have permission?"

**Example Policy**:

```sql
-- Users can only view their own listings
CREATE POLICY "Users can view own listings" ON listings
  FOR SELECT USING (auth.uid() = user_id);
```

**What This Means**:

```typescript
// This query automatically filters by user
const { data } = await supabase.from("listings").select("*");
// Only returns listings where user_id = current user
```

### Current Security Status:

✅ All tables have RLS enabled  
✅ Policies prevent cross-user data access  
✅ Cascade deletion when user is deleted  
✅ Service role keys should never be client-side

---

## 🔄 Database Triggers & Automation

### 1. **Auto-Create Profile on Signup**

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**What It Does**: When user signs up, automatically creates profile row

### 2. **Auto-Update Timestamps**

```sql
CREATE TRIGGER set_updated_at_listings
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
```

**What It Does**: Automatically sets `updated_at` timestamp on every update

---

## 📝 Current Implementation Status

### ✅ **What's Working**:

1. **Supabase client setup** - Connection files exist
2. **Authentication** - Login/signup flow with Supabase Auth
3. **Image upload** - Images stored in Supabase Storage
4. **AI API routes** - All write to `ai_generations` table
5. **Schema defined** - Full SQL setup file exists

### ⚠️ **What's Using Mock Data**:

1. **Listings** - Currently using Zustand store (not real DB)
   - File: `/store/listingStore.ts`
   - Demo data: 3 hardcoded listings
2. **Analytics** - Dashboard shows mock data

   - File: `/components/pages/Analytics.tsx`
   - Not querying real analytics table

3. **Marketplace Connections** - Not implemented yet
   - OAuth flow not built
   - No real posting to marketplaces

### 🚧 **To Make It Production-Ready**:

1. **Replace Zustand with Supabase queries**:

```typescript
// Instead of:
const { listings } = useListingStore();

// Do:
const { data: listings } = await supabase
  .from("listings")
  .select("*")
  .order("created_at", { ascending: false });
```

2. **Update NewListing.tsx to save to DB**:

```typescript
// After handleSubmit (line ~409), add:
const { data, error } = await supabase.from("listings").insert({
  user_id: currentUser.id,
  title,
  price: parseFloat(price),
  description,
  category,
  condition,
  brand,
  images: uploadedImageUrls,
  tags: aiGeneratedData?.tags || [],
  ai_generated: !!aiGeneratedData,
  status: "published",
});

// Then create marketplace_listings entries
for (const marketplace of selectedMarketplaces) {
  await supabase.from("marketplace_listings").insert({
    listing_id: data[0].id,
    marketplace,
    status: "active",
  });
}
```

3. **Query real analytics**:

```typescript
const { data } = await supabase
  .from("analytics")
  .select("*")
  .eq("user_id", user.id)
  .gte("recorded_at", startDate)
  .lte("recorded_at", endDate);
```

---

## 🗺️ Database Connection Map

```
CLIENT-SIDE (Browser)
    ↓
lib/supabase/client.ts
    ↓
SUPABASE API (Cloud)
    ↓
PostgreSQL Database
    ├── auth.users (built-in)
    └── public schema
        ├── profiles
        ├── listings
        ├── marketplace_listings
        ├── marketplace_connections
        ├── analytics
        ├── ai_generations
        └── support_tickets
```

```
SERVER-SIDE (API Routes)
    ↓
lib/supabase/server.ts
    ↓
SUPABASE API (Cloud)
    ↓
PostgreSQL Database (same as above)
```

---

## 📋 Quick Reference Commands

### Create a Listing:

```typescript
const { data, error } = await supabase
  .from("listings")
  .insert({ user_id, title, price, images, status: "published" })
  .select();
```

### Get User's Listings:

```typescript
const { data, error } = await supabase
  .from("listings")
  .select("*, marketplace_listings(*)")
  .eq("user_id", userId)
  .order("created_at", { ascending: false });
```

### Track Analytics Event:

```typescript
await supabase.from("analytics").insert({
  user_id,
  listing_id,
  marketplace: "ebay",
  metric_type: "view",
  metric_value: 1,
});
```

### Get User Profile:

```typescript
const { data } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", userId)
  .single();
```

---

## 🎯 Summary

**Your database is**:

- ✅ **Fully designed** and ready to use
- ✅ **Schema deployed** (via setup.sql)
- ✅ **Secured** with Row Level Security
- ✅ **Connected** to your app
- ⚠️ **Not fully utilized** yet (using mock data)

**Next Steps**:

1. Replace Zustand store with real DB queries
2. Connect NewListing form to `listings` table
3. Build analytics dashboard from real data
4. Implement marketplace OAuth flow

**Files to Modify**:

- `/store/listingStore.ts` → Convert to DB queries
- `/components/pages/NewListing.tsx` → Save to DB
- `/components/pages/Dashboard.tsx` → Query real data
- `/components/pages/Analytics.tsx` → Query analytics table
