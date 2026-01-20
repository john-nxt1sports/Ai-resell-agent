# Component Architecture - Bulk Listing

## 📐 Component Hierarchy

```
BulkListing (Main Page Component)
│
├── Header Section
│   ├── Title: "Bulk Create Listings"
│   └── Description
│
├── Stats Bar (Conditional: shows when items exist)
│   ├── Total Items Count
│   ├── Ready to Post Count
│   └── Pending Count
│
├── Form
│   │
│   ├── Quick Upload Section
│   │   ├── Section Header
│   │   │   ├── Title: "Quick Upload"
│   │   │   └── "Add Manual Item" Button
│   │   ├── Description Text
│   │   └── BulkFileUploader Component
│   │       └── FileUploader Component (reused)
│   │
│   ├── Listing Items Grid (Conditional: shows when items exist)
│   │   ├── Section Header: "Listing Items (X)"
│   │   └── Grid Layout (2 columns on desktop)
│   │       └── BulkItemCard Components (one per item)
│   │           ├── Status Badge & Remove Button
│   │           ├── Image Upload Area
│   │           │   ├── Drag-drop zone
│   │           │   ├── Image grid (max 6)
│   │           │   └── Add more button
│   │           ├── Title Input
│   │           └── Price Input
│   │
│   ├── Marketplace Selection (Conditional: shows when items exist)
│   │   ├── Section Header: "Select Marketplaces for All Items"
│   │   └── MarketplaceSelector Component (reused)
│   │       ├── Poshmark Button
│   │       ├── Mercari Button
│   │       └── eBay Button
│   │
│   └── Submit Button (Conditional: shows when items exist)
│       └── "Create & Post X Listings with AI"
│
├── Empty State (Conditional: shows when no items)
│   ├── Icon
│   ├── Title: "No items yet"
│   ├── Description
│   └── "Add Your First Item" Button
│
└── Info Box (Pro Tip)
```

---

## 🧩 Component Details

### 1. BulkListing Component

**Type**: Page Component (Client-side)  
**Location**: `components/pages/BulkListing.tsx`

**Responsibilities**:

- State management for all listing items
- Validation logic
- Form submission
- Marketplace selection
- Routing after submission

**State**:

```typescript
const [bulkItems, setBulkItems] = useState<BulkListingItem[]>([]);
const [selectedMarketplaces, setSelectedMarketplaces] = useState<Marketplace[]>(
  []
);
const [isProcessing, setIsProcessing] = useState(false);
```

**Key Methods**:

- `handleAddNewItem()` - Creates empty item
- `handleUpdateItem(id, updates)` - Updates specific item
- `handleRemoveItem(id)` - Removes item
- `validateItem(item)` - Checks if item is ready
- `handleBulkUpload(images)` - Creates items from images
- `handleSubmit(e)` - Posts all ready items

---

### 2. BulkItemCard Component

**Type**: UI Component (Client-side)  
**Location**: `components/ui/BulkItemCard.tsx`

**Responsibilities**:

- Display individual listing item
- Handle image uploads for item
- Inline editing (title, price)
- Show validation status
- Remove functionality

**Props**:

```typescript
interface BulkItemCardProps {
  item: BulkListingItem;
  onUpdate: (updates: Partial<BulkListingItem>) => void;
  onRemove: () => void;
}
```

**Visual States**:

- **Ready** (Green border) - All fields complete
- **Pending** (Yellow border) - Missing information
- **Error** (Red border) - Validation error

---

### 3. BulkFileUploader Component

**Type**: Wrapper Component  
**Location**: Inside `BulkListing.tsx`

**Responsibilities**:

- Wraps FileUploader for bulk context
- Clears images after upload
- Calls parent handler with new images

---

## 🔄 Data Flow

### Upload Flow

```
User uploads images
    ↓
BulkFileUploader receives files
    ↓
FileUploader compresses images
    ↓
BulkFileUploader calls onImagesUploaded()
    ↓
BulkListing.handleBulkUpload() creates items
    ↓
Items added to bulkItems state
    ↓
Grid re-renders with new BulkItemCards
```

### Edit Flow

```
User edits title/price in BulkItemCard
    ↓
BulkItemCard calls onUpdate(updates)
    ↓
BulkListing.handleUpdateItem() updates state
    ↓
validateItem() checks completeness
    ↓
Item status updated
    ↓
Card border color changes
```

### Submit Flow

```
User clicks "Create & Post X Listings"
    ↓
handleSubmit() validates ready items
    ↓
Check marketplace selection
    ↓
Loop through ready items
    ↓
Add each to listingStore (Zustand)
    ↓
Show processing state
    ↓
Redirect to dashboard
    ↓
Show success message
```

---

## 🎨 Styling Architecture

### Tailwind Classes Used

**Container/Layout**:

- `max-w-6xl mx-auto` - Centered, wide container
- `space-y-6` - Consistent vertical spacing
- `grid grid-cols-1 lg:grid-cols-2 gap-4` - Responsive grid

**Cards**:

- `bg-white dark:bg-dark-900` - Background
- `rounded-xl` - Rounded corners
- `border border-dark-200 dark:border-dark-800` - Border
- `p-6` - Padding

**Status Colors**:

- Ready: `border-green-500 bg-green-50 dark:bg-green-900/10`
- Pending: `border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10`
- Error: `border-red-500 bg-red-50 dark:bg-red-900/10`

**Interactive Elements**:

- `hover:bg-primary-600` - Hover states
- `transition-all` - Smooth animations
- `disabled:opacity-50` - Disabled states

---

## 🔌 Reused Components

### FileUploader

- **From**: `components/ui/FileUploader.tsx`
- **Used For**: Bulk image upload
- **Props**: `images`, `onImagesChange`

### MarketplaceSelector

- **From**: `components/ui/MarketplaceSelector.tsx`
- **Used For**: Selecting marketplaces for all items
- **Props**: `selected`, `onChange`

---

## 📊 State Management

### Local State (useState)

- `bulkItems` - Array of listing items
- `selectedMarketplaces` - Selected marketplaces
- `isProcessing` - Submit state

### Global State (Zustand)

- `useListingStore` - Adding listings to store
- `useUIStore` - Not directly used but available

---

## 🎯 Validation Logic

### Item Validation

```typescript
const validateItem = (item: BulkListingItem): "ready" | "pending" | "error" => {
  if (!item.title || item.price <= 0 || item.images.length === 0) {
    return "pending";
  }
  return "ready";
};
```

### Form Validation

- At least one ready item required
- At least one marketplace selected
- Shows alert if validation fails

---

## 🚀 Performance Considerations

### Optimizations

- Image compression on upload
- Efficient state updates (only changed items)
- Lazy image loading
- Debounced validation (potential improvement)

### Potential Bottlenecks

- Large number of items (100+)
- Multiple large images per item
- Synchronous processing loop

### Future Improvements

- Virtual scrolling for 50+ items
- Web Workers for image processing
- Async batch processing
- Progressive upload

---

## 🧪 Testing Checklist

### Functional Tests

- [ ] Upload single image → creates item
- [ ] Upload multiple images → creates multiple items
- [ ] Manual add → creates empty item
- [ ] Edit title → updates item
- [ ] Edit price → updates item
- [ ] Upload image to item → adds to gallery
- [ ] Remove image → removes from gallery
- [ ] Remove item → deletes from list
- [ ] Select marketplace → updates selection
- [ ] Submit ready items → posts to store
- [ ] Submit without marketplaces → shows alert

### UI Tests

- [ ] Responsive on mobile
- [ ] Responsive on tablet
- [ ] Responsive on desktop
- [ ] Dark mode works
- [ ] Status colors correct
- [ ] Icons display properly
- [ ] Animations smooth

---

## 📝 Type Definitions

### BulkListingItem

```typescript
interface BulkListingItem {
  id: string; // Unique identifier
  title: string; // Product title
  price: number; // Price in USD
  images: string[]; // Image URLs/previews
  tempImages?: UploadedImage[]; // File objects for upload
  status: "pending" | "ready" | "error"; // Validation status
  error?: string; // Error message if any
}
```

### Related Types

- `UploadedImage` from `types/index.ts`
- `Marketplace` from `types/index.ts`
- `Listing` from `types/index.ts`

---

This architecture provides a solid, scalable foundation for the bulk listing feature! 🎉
