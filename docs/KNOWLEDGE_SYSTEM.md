# Knowledge System Documentation

## Overview

The TalkWeb knowledge system uses **PostgreSQL with pgvector** to store and search through assistant knowledge bases using semantic vector embeddings. This provides powerful semantic search capabilities directly within your Supabase database.

## Architecture

### Components

1. **Knowledge Vectors Table** (`knowledge_vectors`)
   - Stores text content with vector embeddings
   - Uses pgvector extension for similarity search
   - Supports multiple source types (scraped, uploaded, manual)

2. **Vector Embeddings**
   - Generated using OpenAI's `text-embedding-3-small` model (1536 dimensions)
   - Fallback to `text-embedding-3-large` (3072 dimensions) if needed
   - Stored as pgvector type in PostgreSQL

3. **Search Functions**
   - `knowledge-search`: Main search endpoint for assistants
   - `enhanced-knowledge-search`: Advanced search with quality scoring
   - `search_knowledge_vectors`: Database RPC function for vector similarity

## Database Schema

### knowledge_vectors Table

```sql
CREATE TABLE knowledge_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id UUID NOT NULL REFERENCES assistants(id),
  vector_embedding VECTOR(1536), -- or VECTOR(3072)
  content TEXT NOT NULL,
  title TEXT,
  url TEXT,
  source_type TEXT NOT NULL DEFAULT 'scraped',
  source_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX idx_knowledge_vectors_embedding ON knowledge_vectors 
USING ivfflat (vector_embedding vector_cosine_ops);

-- Index for assistant lookup
CREATE INDEX idx_knowledge_vectors_assistant ON knowledge_vectors(assistant_id);
```

### Source Types

- `scraped`: Content scraped from websites
- `uploaded`: Manually uploaded documents
- `manual`: Manually entered content
- `semantic_enhanced`: Enhanced semantic content

## Edge Functions

### 1. knowledge-upsert

**Purpose**: Add or update knowledge base content for an assistant

**Endpoint**: `supabase.functions.invoke('knowledge-upsert', { body })`

**Request Body**:
```typescript
{
  assistantId: string;
  pages?: Array<{
    url: string;
    title: string;
    content: string;
  }>;
  websiteUrl?: string;      // For automatic scraping
  useScraper?: boolean;     // Enable Firecrawl scraping
  tags?: string[];          // Custom tags
  replace?: boolean;        // Replace existing content
  forceClean?: boolean;     // Force clean before upserting
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
  vectorsUpserted: number;
  pagesProcessed: number;
  model: string;           // embedding model used
  dimensions: number;      // vector dimensions
}
```

**Example**:
```typescript
const { data, error } = await supabase.functions.invoke('knowledge-upsert', {
  body: {
    assistantId: 'uuid-here',
    pages: [
      {
        url: 'https://example.com/about',
        title: 'About Us',
        content: 'We are a company that...'
      }
    ],
    tags: ['company-info', 'about']
  }
});
```

### 2. knowledge-search

**Purpose**: Search knowledge base for relevant content

**Endpoint**: `supabase.functions.invoke('knowledge-search', { body })`

**Request Body**:
```typescript
{
  assistantId: string;
  query: string;
  topK?: number;           // Default: 5
}
```

**Response**:
```typescript
{
  success: boolean;
  matches: Array<{
    id: string;
    content: string;
    title?: string;
    url?: string;
    score: number;         // Similarity score (0-1)
    metadata?: object;
  }>;
  source: string;          // 'pgvector' | 'scraped' | 'fallback'
}
```

**Example**:
```typescript
const { data, error } = await supabase.functions.invoke('knowledge-search', {
  body: {
    assistantId: 'uuid-here',
    query: 'What are your business hours?',
    topK: 3
  }
});
```

### 3. enhanced-knowledge-search

**Purpose**: Advanced search with quality scoring and perplexity integration

**Endpoint**: `supabase.functions.invoke('enhanced-knowledge-search', { body })`

**Request Body**:
```typescript
{
  assistantId: string;
  query: string;
  usePerplexity?: boolean;  // Use Perplexity AI for additional context
  topK?: number;
}
```

**Response**:
```typescript
{
  success: boolean;
  results: Array<{
    content: string;
    title?: string;
    url?: string;
    score: number;
    quality: 'high' | 'medium' | 'low';
    explanation?: string;
    source_type: string;
  }>;
  diagnostics: {
    totalResults: number;
    sourcesSearched: string[];
    processingTimeMs: number;
    qualityDistribution: object;
  };
}
```

### 4. knowledge-delete

**Purpose**: Delete all knowledge vectors for an assistant

**Endpoint**: `supabase.functions.invoke('knowledge-delete', { body })`

**Request Body**:
```typescript
{
  assistantId: string;
}
```

**Authorization**: Requires admin authentication

### 5. knowledge-diagnostics

**Purpose**: Check knowledge system health and configuration

**Endpoint**: `supabase.functions.invoke('knowledge-diagnostics', { body })`

**Request Body**:
```typescript
{
  assistantId?: string;  // Optional: check specific assistant
}
```

**Response**:
```typescript
{
  ok: boolean;
  environment: {
    hasOpenAI: boolean;
    hasSupabase: boolean;
    hasFirecrawl: boolean;
  };
  openai?: {
    ok: boolean;
    model: string;
  };
  pgvector?: {
    ok: boolean;
    vectorCount: number;
    assistantVectorCount?: number;
  };
  firecrawl?: {
    ok: boolean;
    pages_scraped?: number;
  };
}
```

## UI Components

### KnowledgeManager

Main component for managing knowledge bases in the dashboard.

**Location**: `src/components/KnowledgeManager.tsx`

**Features**:
- Upload and scrape content
- Search and test knowledge base
- View diagnostics
- Delete knowledge vectors

### KnowledgeBaseBuilder

Component for building knowledge bases from uploaded content.

**Location**: `src/components/KnowledgeBaseBuilder.tsx`

**Features**:
- Drag-and-drop file upload
- Manual URL entry
- Automatic scraping
- Progress tracking

## Search Quality

### Quality Scoring

The enhanced search uses multiple factors to score results:

1. **Similarity Score** (60% weight)
   - Cosine similarity between query and content embeddings
   - Range: 0-1

2. **Content Length** (10% weight)
   - Optimal length: 200-1200 characters
   - Penalizes very short or very long content

3. **Source Type** (10% weight)
   - `semantic_enhanced`: +0.3
   - `scraped`: +0.1
   - `fallback`: -0.1

4. **Metadata Richness** (10% weight)
   - Has title: +0.1
   - Has clean URL: +0.1
   - Has structured data: +0.1

5. **Recency** (10% weight)
   - Recent content gets slight boost

### Quality Categories

- **High Quality**: Score ≥ 0.7
- **Medium Quality**: Score 0.4 - 0.7
- **Low Quality**: Score < 0.4

## Best Practices

### Content Preparation

1. **Chunk Size**: Aim for 500-1000 characters per chunk
2. **Overlap**: Use 100-200 character overlap between chunks
3. **Titles**: Always include meaningful titles
4. **URLs**: Provide source URLs for traceability
5. **Metadata**: Add relevant tags and categories

### Performance Optimization

1. **Indexes**: Ensure vector index is created
   ```sql
   CREATE INDEX IF NOT EXISTS idx_knowledge_vectors_embedding 
   ON knowledge_vectors USING ivfflat (vector_embedding vector_cosine_ops);
   ```

2. **Batch Operations**: Use batch inserts for large datasets
3. **Regular Cleanup**: Remove outdated vectors periodically
4. **Monitor Size**: Keep vector count per assistant reasonable (< 10,000)

### Troubleshooting

#### No Search Results

1. Check if vectors exist:
   ```sql
   SELECT COUNT(*) FROM knowledge_vectors WHERE assistant_id = 'uuid';
   ```

2. Verify embeddings are not null:
   ```sql
   SELECT COUNT(*) FROM knowledge_vectors 
   WHERE assistant_id = 'uuid' AND vector_embedding IS NOT NULL;
   ```

3. Test with broader queries
4. Check similarity threshold (default: 0.1)

#### Slow Searches

1. Verify index exists:
   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'knowledge_vectors';
   ```

2. Analyze query performance:
   ```sql
   EXPLAIN ANALYZE 
   SELECT * FROM knowledge_vectors 
   WHERE assistant_id = 'uuid' 
   ORDER BY vector_embedding <=> '[...]' 
   LIMIT 5;
   ```

3. Consider increasing index lists for IVFFlat

#### Dimension Mismatch Errors

If you see dimension mismatch errors:

1. Check current dimensions:
   ```sql
   SELECT DISTINCT vector_dims(vector_embedding) 
   FROM knowledge_vectors;
   ```

2. The system will automatically retry with the correct model
3. May need to re-index if mixed dimensions exist

## Migration from Pinecone

The system was migrated from Pinecone to pgvector. Key differences:

### Before (Pinecone)
- External vector database
- API-based access
- Separate infrastructure
- Additional cost per vector

### After (pgvector)
- Integrated with PostgreSQL
- Direct database access
- Same infrastructure as main DB
- No additional per-vector cost

### Migration Impact

1. **No Code Changes Needed**: The API remains the same
2. **Performance**: Similar or better for most queries
3. **Cost**: Reduced (no separate vector DB)
4. **Scalability**: Scales with your Supabase instance

## API Reference

### Database RPC Functions

#### search_knowledge_vectors

```sql
CREATE FUNCTION search_knowledge_vectors(
  query_embedding VECTOR(1536),
  assistant_id UUID,
  match_threshold FLOAT DEFAULT 0.1,
  match_count INT DEFAULT 5
) RETURNS TABLE(...)
```

**Usage**:
```typescript
const { data, error } = await supabase
  .rpc('search_knowledge_vectors', {
    query_embedding: [...],
    assistant_id: 'uuid',
    match_threshold: 0.2,
    match_count: 10
  });
```

## Security

### Row Level Security (RLS)

The `knowledge_vectors` table has RLS enabled:

```sql
-- Service role can manage all
CREATE POLICY "Service can manage all knowledge vectors"
ON knowledge_vectors FOR ALL
USING (auth.role() = 'service_role');

-- Users can view their assistant's vectors
CREATE POLICY "Users can view knowledge vectors for their assistants"
ON knowledge_vectors FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM assistants
    WHERE assistants.id = knowledge_vectors.assistant_id
    AND assistants.user_id = auth.uid()
  )
);
```

### Best Security Practices

1. Always use service role key for edge functions
2. Validate assistant ownership before operations
3. Sanitize user input before embedding
4. Rate limit search requests
5. Monitor for abuse patterns

## Cost Considerations

### OpenAI Embeddings

- Model: `text-embedding-3-small`
- Cost: ~$0.00002 per 1K tokens
- Average: ~200 tokens per chunk
- 1000 chunks ≈ $0.004

### Supabase Storage

- Vector storage: ~6KB per 1536-dim vector
- 10,000 vectors ≈ 60MB
- Included in Supabase database storage

### Total Cost Estimate

For a typical assistant with 5,000 knowledge chunks:
- Embedding cost: ~$0.02 (one-time)
- Storage cost: ~$0.00 (included)
- Search cost: ~$0.00 (database queries)

**Total**: Essentially free after initial indexing

## Support

For issues or questions:
1. Check diagnostics: Use `knowledge-diagnostics` function
2. Review edge function logs in Supabase dashboard
3. Check database query performance
4. Verify environment variables are set

## Changelog

### Version 2.0 (Current)
- Migrated from Pinecone to pgvector
- Added enhanced search with quality scoring
- Improved performance monitoring
- Better error handling and logging

### Version 1.0
- Initial Pinecone implementation
- Basic search functionality
- Manual content upload
