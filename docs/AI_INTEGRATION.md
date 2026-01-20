# AI Integration Guide

## Overview

This application uses OpenRouter API to access multiple AI models (Claude, GPT-4, Llama, Gemini) for intelligent listing generation, image analysis, and optimization.

## Architecture

```
lib/ai/
├── types.ts          # TypeScript type definitions
├── client.ts         # OpenRouter API client
├── service.ts        # High-level AI operations
├── hooks.ts          # React hooks for frontend
└── index.ts          # Central exports

app/api/ai/
├── generate-listing/     # Single listing generation
├── generate-bulk/        # Bulk listing generation
├── analyze-images/       # Image analysis
├── optimize-listing/     # Listing optimization
└── chat/                 # AI Assistant chat endpoint
```

## Features

### 1. Listing Generation

Generate SEO-optimized listings from basic product information.

**API Endpoint:** `POST /api/ai/generate-listing`

**Request:**

```json
{
  "input": {
    "title": "Nike Air Max",
    "category": "Shoes",
    "condition": "New",
    "price": 120,
    "brand": "Nike"
  },
  "model": "google/gemini-3-pro-preview"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "title": "Nike Air Max 2024 - Brand New Athletic Running Shoes",
    "description": "Experience ultimate comfort...",
    "tags": ["nike", "air max", "running shoes", "athletic"],
    "suggestedPrice": 125,
    "marketplaceOptimizations": {
      "ebay": "Focus on condition and authenticity",
      "poshmark": "Emphasize style and brand",
      "mercari": "Highlight free shipping and fast delivery"
    }
  },
  "metadata": {
    "tokensUsed": 450,
    "cost": 0.00135,
    "duration": 2340
  }
}
```

### 2. Bulk Generation

Process multiple items at once (up to 50 per request).

**API Endpoint:** `POST /api/ai/generate-bulk`

**Request:**

```json
{
  "inputs": [
    { "title": "Item 1", "category": "Electronics", "condition": "Good" },
    { "title": "Item 2", "category": "Clothing", "condition": "New" }
  ],
  "model": "google/gemini-3-pro-preview"
}
```

### 3. Image Analysis

Extract product details from images using vision models.

**API Endpoint:** `POST /api/ai/analyze-images`

**Request:**

```json
{
  "imageUrls": [
    "https://example.com/product1.jpg",
    "https://example.com/product2.jpg"
  ],
  "model": "google/gemini-3-pro-preview"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "description": "A pair of blue denim jeans...",
    "detectedItems": ["jeans", "denim"],
    "suggestedCategory": "Clothing > Pants",
    "suggestedCondition": "Like New",
    "suggestedBrand": "Levi's",
    "colors": ["blue", "indigo"],
    "keywords": ["denim", "jeans", "casual", "vintage"]
  }
}
```

### 4. Listing Optimization

Improve existing listings for better performance.

**API Endpoint:** `POST /api/ai/optimize-listing`

**Request:**

```json
{
  "title": "shoes for sale",
  "description": "Good condition",
  "marketplace": "ebay",
  "model": "google/gemini-3-pro-preview"
}
```

## Usage in Components

### React Hooks

```typescript
import { useGenerateListing } from "@/lib/ai";

function MyComponent() {
  const { data, loading, error, execute } = useGenerateListing();

  const handleGenerate = async () => {
    const listing = await execute({
      title: "Product Name",
      category: "Electronics",
      condition: "New",
      price: 99.99,
    });

    if (listing) {
      console.log("Generated:", listing);
    }
  };

  return (
    <button onClick={handleGenerate} disabled={loading}>
      {loading ? "Generating..." : "Generate Listing"}
    </button>
  );
}
```

### Available Hooks

- `useGenerateListing()` - Generate single listing
- `useGenerateBulk()` - Generate multiple listings
- `useAnalyzeImages()` - Analyze product images
- `useOptimizeListing()` - Optimize existing listing

## AI Models

### Google Gemini 3 Pro (Default)

- **Model ID:** `google/gemini-3-pro-preview`
- **Best for:** Listing generation, optimization, image analysis
- **Cost:** ~$1.25/1M tokens
- **Speed:** Fast

### Google Gemini 3 Pro Image

- **Model ID:** `google/gemini-3-pro-image-preview`
- **Best for:** AI product image generation
- **Cost:** ~$2/1M tokens
- **Speed:** Medium

### Claude 3.5 Sonnet

- **Model ID:** `anthropic/claude-3.5-sonnet`
- **Best for:** Complex listing generation
- **Cost:** ~$3/1M tokens
- **Speed:** Fast

### GPT-4 Turbo

- **Model ID:** `openai/gpt-4-turbo`
- **Best for:** Complex analysis, detailed descriptions
- **Cost:** ~$10/1M tokens
- **Speed:** Medium

### GPT-4o

- **Model ID:** `openai/gpt-4o`
- **Best for:** Image analysis, multimodal tasks
- **Cost:** ~$5/1M tokens
- **Speed:** Fast

### GPT-3.5 Turbo

- **Model ID:** `openai/gpt-3.5-turbo`
- **Best for:** Budget-friendly operations
- **Cost:** ~$0.5/1M tokens
- **Speed:** Very fast

### Llama 3.1 70B

- **Model ID:** `meta-llama/llama-3.1-70b-instruct`
- **Best for:** Open-source option
- **Cost:** ~$0.8/1M tokens
- **Speed:** Fast

## Environment Setup

Add to `.env.local`:

```bash
# Supabase (Required for image storage and authentication)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenRouter AI (Required for AI features)
OPENROUTER_API_KEY=your_api_key_here

# App Configuration
NEXT_PUBLIC_APP_NAME=ListingsAI
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Image Upload Flow

Before AI can analyze images, they must be uploaded to Supabase Storage:

1. **User uploads images** → FileUploader component
2. **Auto-upload to Supabase** → Storage bucket `listing-images`
3. **Get public URLs** → Used for AI analysis
4. **Analyze with AI** → Vision model (GPT-4o) processes images
5. **Extract metadata** → Brand, category, condition, colors

```typescript
// Automatic flow in NewListing component
useEffect(() => {
  if (images.length > 0) {
    // 1. Upload to Supabase Storage
    const uploadResults = await uploadImages(imageFiles, userId);

    // 2. Get public URLs
    const imageUrls = uploadResults.map((r) => r.url);

    // 3. Analyze with AI
    await analyzeImages(imageUrls);
  }
}, [images]);
```

## Usage Tracking

All AI operations are automatically logged to the `ai_generations` table:

```sql
CREATE TABLE ai_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  tokens_used INTEGER,
  cost DECIMAL(10, 6),
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Error Handling

All API routes include:

- Authentication verification
- Input validation
- Detailed error messages
- Automatic failure logging
- Graceful degradation

Example error response:

```json
{
  "error": "Failed to generate listing: API rate limit exceeded"
}
```

## Best Practices

1. **Choose the Right Model**
   - Use Claude for text generation (quality)
   - Use GPT-4o for image analysis (vision)
   - Use GPT-3.5 for speed/cost optimization

2. **Batch Operations**
   - Use bulk endpoints for multiple items
   - Maximum 50 items per bulk request
   - Maximum 10 images per analysis request

3. **Cost Management**
   - Monitor usage in `ai_generations` table
   - Set up usage limits per user/plan
   - Cache results when possible

4. **Rate Limiting**
   - Implement client-side debouncing
   - Add loading states to prevent double requests
   - Consider request queuing for bulk operations

## AI Assistant Chat

The sidebar AI Assistant provides real-time conversational help powered by Claude 3.5 Sonnet.

**API Endpoint:** `POST /api/ai/chat`

**Request:**

```json
{
  "messages": [
    { "role": "user", "content": "How should I price this item?" },
    { "role": "assistant", "content": "I can help with pricing..." },
    { "role": "user", "content": "It's a used Nike jacket" }
  ],
  "context": {
    "currentListing": {
      "title": "Nike Jacket",
      "category": "Clothing",
      "condition": "Used"
    }
  }
}
```

**Response:**

```json
{
  "message": "Based on the used condition and Nike brand, I recommend...",
  "usage": { "prompt_tokens": 120, "completion_tokens": 85 }
}
```

**Frontend Hook:**

```typescript
import { useAIChat } from "@/lib/ai/hooks";

const { loading, error, sendMessage } = useAIChat();

const response = await sendMessage(conversationHistory, context);
```

**Features:**

- Contextual help with current listing data
- Conversational memory across messages
- Quick action buttons for common tasks
- Real-time streaming responses (future)

## Example Implementation

- **Listing Creation:** See `components/pages/NewListing.tsx` for AI-powered listing generation
- **AI Assistant:** See `components/layout/AIAssistant.tsx` for conversational AI chat

## Troubleshooting

### "OpenRouter API key is required"

- Ensure `OPENROUTER_API_KEY` is set in `.env.local`
- Restart development server after adding environment variables

### "Failed to parse AI response"

- Some models may format JSON differently
- The `extractJSON` function handles most cases
- Check OpenRouter dashboard for model-specific issues

### High Token Usage

- Reduce input length (descriptions, etc.)
- Use more efficient models (GPT-3.5, Llama)
- Implement response caching

## Support

For issues or questions:

- OpenRouter Docs: https://openrouter.ai/docs
- API Status: https://status.openrouter.ai
