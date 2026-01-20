# Bulk Listing Page - Feature Documentation

## Overview

The Bulk Listing page allows users to create and post multiple product listings simultaneously, maintaining the same sleek design and user experience as the single listing page.

## Page Location

- **URL**: `/listings/bulk`
- **File**: `app/listings/bulk/page.tsx`

## Key Features

### 1. **Quick Upload**

- Bulk image uploader that creates individual listing items automatically
- Each uploaded image becomes a separate listing item
- Manual "Add Item" button for custom entries

### 2. **Stats Dashboard**

- Real-time counters showing:
  - Total items
  - Ready to post (complete items)
  - Pending items (incomplete)
- Color-coded status indicators

### 3. **Individual Item Cards**

- Each listing item displayed in a responsive grid
- Status indicators (ready, pending, error)
- Inline editing for:
  - Product images (drag-drop or click to upload)
  - Title
  - Price
- Remove button for each item
- Image gallery with thumbnail grid (up to 6 images per item)

### 4. **Marketplace Selection**

- Same marketplace selector as single listing page
- Applied to ALL items in the batch
- Visual toggle buttons for Poshmark, Mercari, and eBay

### 5. **Validation & Status**

- Automatic validation for each item
- Color-coded borders:
  - **Green**: Ready to post (complete)
  - **Yellow**: Pending (missing information)
  - **Red**: Error state
- Status icons for quick visual reference

### 6. **Bulk Submit**

- Single button to post all ready items
- Shows count of items being posted
- AI processing simulation
- Success notification with count

## Components

### BulkListing.tsx

Main page component handling:

- State management for all listing items
- Bulk upload logic
- Form submission
- Marketplace selection
- Empty state display

### BulkItemCard.tsx

Individual listing item card featuring:

- Image upload/management
- Title and price inputs
- Status display
- Remove functionality
- Drag-and-drop support

### types/bulk.ts

TypeScript definitions for:

- `BulkListingItem` interface
- Status types
- Item validation

## User Flow

1. **Start**: User navigates to `/listings/bulk`
2. **Upload**:
   - Option A: Bulk upload multiple images
   - Option B: Manually add individual items
3. **Edit**: Fill in title and price for each item
4. **Select Markets**: Choose which marketplaces to post to
5. **Submit**: AI processes and posts all ready items
6. **Complete**: Redirect to dashboard with success message

## Responsive Design

- **Desktop**: 2-column grid for listing items
- **Tablet**: 2-column grid maintained
- **Mobile**: Single column layout
- All inputs and buttons optimized for touch

## Navigation

Added to sidebar as:

- **Label**: "Bulk Upload"
- **Icon**: Upload icon
- **Position**: Between "New Listing" and "All Listings"

## Future Enhancements

- CSV import for bulk data
- Template system for common products
- Auto-grouping of related images
- Duplicate detection
- Batch editing (apply title/price pattern)
- Progress bar during AI processing
- Individual item success/failure tracking
