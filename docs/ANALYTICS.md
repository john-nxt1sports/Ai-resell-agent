# Analytics Page - Feature Documentation

## Overview

The Analytics page provides resellers with clear, actionable insights to grow their business without overwhelming complexity. Clean design, key metrics, and smart insights help users understand their performance at a glance.

## Page Location

- **URL**: `/analytics`
- **File**: `app/analytics/page.tsx`

## Key Features

### 1. **Time Range Selector**

- Switch between 7 days, 30 days, 90 days, or All Time
- Styled toggle buttons for quick switching
- Updates all metrics based on selected range

### 2. **Key Metrics Dashboard**

Four primary KPI cards showing:

- **Total Views** - How many people viewed your listings
- **Likes** - Engagement on your items
- **Sales** - Number of completed sales
- **Revenue** - Total money earned

Each card includes:

- Icon with color coding
- Current value
- Percentage change vs previous period
- Up/down arrow indicators

### 3. **Marketplace Performance**

Detailed breakdown by platform:

- **Poshmark** (Red) - Performance metrics
- **Mercari** (Blue) - Performance metrics
- **eBay** (Yellow) - Performance metrics

Shows per marketplace:

- Active listings count
- Total views
- Sales count
- Revenue generated

**Responsive:**

- Desktop: Horizontal layout with all stats
- Mobile: Stacked compact view

### 4. **Top Performers**

List of your best-selling items:

- Ranked 1-3 with badge
- Item title and price
- View count
- Like count
- Truncated text for long titles

### 5. **Quick Stats Panel**

Essential business metrics:

- Total Listings
- Active Listings
- Draft Listings
- Total Inventory Value
- Average Price
- Conversion Rate

Clean two-column layout with labels and values.

### 6. **Performance Insights Card**

AI-powered insights section with:

- Gradient background for visual appeal
- Bullet-point insights
- Color-coded indicators:
  - ✓ Green: Positive insights
  - → Yellow: Suggestions
- Actionable recommendations

## Design Elements

### Color Scheme

- **Views**: Blue (`bg-blue-500`)
- **Likes**: Pink (`bg-pink-500`)
- **Sales**: Green (`bg-green-500`)
- **Revenue**: Purple (`bg-purple-500`)

### Card Styles

- White background with dark mode support
- Rounded corners (`rounded-xl`)
- Subtle shadows with hover effects
- Border styling matching app theme

### Icons

- Eye (views)
- Heart (likes)
- Shopping Cart (sales)
- Dollar Sign (revenue)
- Trending Up (insights)
- Calendar (time range)

## Responsive Breakpoints

### Mobile (< 640px)

- Single column metric cards
- Stacked marketplace stats
- Compact top performers
- Full-width insights

### Tablet (640px - 1024px)

- 2-column metric grid
- Expanded marketplace cards
- Side-by-side panels

### Desktop (> 1024px)

- 4-column metric grid
- Full marketplace details
- 2-column layout for performers/stats
- Spacious layout

## Data Flow

### Current Implementation (MVP)

```typescript
// Mock data for demonstration
const metrics = {
  views: 1247,
  viewsChange: 12.5,
  likes: 89,
  salesChange: 18.7,
  // ...
};
```

### Future Implementation

```typescript
// Will fetch from API
const metrics = await api.analytics.getMetrics(timeRange);
const marketplaceStats = await api.analytics.getMarketplaceStats(timeRange);
const topPerformers = await api.analytics.getTopPerformers(timeRange);
```

## User Workflow

1. **Land on page** - See default 30-day view
2. **Review metrics** - Quick scan of key numbers
3. **Check change** - See if trending up or down
4. **Switch time range** - Compare different periods
5. **Dive deeper** - Review marketplace performance
6. **Identify winners** - Check top performers
7. **Read insights** - Get AI recommendations
8. **Take action** - Apply learnings to listings

## Components Structure

### Analytics.tsx

Main page component with:

- State for time range selection
- Metric calculations from store
- Layout structure
- Responsive grid

### MetricCard Component

Reusable card displaying:

- Title
- Value
- Change percentage
- Icon
- Color coding

**Props:**

```typescript
{
  title: string;
  value: string | number;
  change: number;
  icon: LucideIcon;
  color: string;
}
```

### StatRow Component

Simple two-column stat display:

- Label (left)
- Value (right)

**Props:**

```typescript
{
  label: string;
  value: string | number;
}
```

## Metrics Explained

### Views

Total number of times your listings were viewed by potential buyers.

### Likes

Number of users who favorited/liked your items, indicating strong interest.

### Sales

Completed transactions where items were purchased.

### Revenue

Total money earned from completed sales (before fees).

### Conversion Rate

Percentage of views that resulted in sales (Sales / Views × 100).

### Average Price

Mean price of your active listings (Total Value / Active Listings).

## Future Enhancements

### Phase 2

- [ ] Real-time data from backend
- [ ] Interactive charts (line graphs, bar charts)
- [ ] Date range picker with custom dates
- [ ] Export reports to CSV/PDF
- [ ] Comparison view (period vs period)

### Phase 3

- [ ] Predictive analytics
- [ ] Automated insights (when to list, what to list)
- [ ] Competitor benchmarking
- [ ] Email/SMS alerts for milestones
- [ ] Integration with accounting tools

## Performance Considerations

- Mock data loads instantly
- Responsive images not used (stats only)
- Minimal re-renders with proper state management
- Fast page transitions

## Best Practices for Users

### Daily Check

- Review key metrics
- Check new sales
- Monitor top performers

### Weekly Analysis

- Switch to 7-day view
- Compare to previous week
- Adjust pricing if needed

### Monthly Planning

- Use 30-day view
- Identify trends
- Plan next month's inventory

## Insights Algorithm (Future)

The AI insights will analyze:

1. **Performance trends** - What's working
2. **Optimal timing** - When to post
3. **Pricing strategy** - Competitive pricing
4. **Category performance** - Best-selling types
5. **Marketplace comparison** - Where to focus

Example insights:

- "Your shoes category is outperforming by 45%"
- "List new items on Thursdays for 30% more views"
- "Consider lowering prices on items over 60 days old"

## Testing Checklist

- [ ] Metrics display correctly
- [ ] Time range switcher works
- [ ] Marketplace stats render properly
- [ ] Top performers list shows
- [ ] Quick stats calculate correctly
- [ ] Insights card displays
- [ ] Responsive on mobile
- [ ] Dark mode works
- [ ] Percentages show correct colors (green/red)
- [ ] Icons render properly

## Accessibility

- Clear labels on all metrics
- Color + icon for change indicators (not just color)
- Proper heading hierarchy
- Touch-friendly buttons (mobile)
- Readable font sizes

---

**The Analytics page empowers resellers with data-driven insights in a clean, non-overwhelming interface!** 📊
