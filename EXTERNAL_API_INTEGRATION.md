# External API Integration Guide

## Overview
The application now fetches game data directly from the external 24payseller API (`https://x.24payseller.com/products/list`) instead of relying on a local database.

## Key Features

### 1. **Automatic API Caching**
- Games are cached for 1 hour to reduce API calls
- Cache is automatically refreshed after expiry
- No manual cache management needed

### 2. **Game Slugs**
- Games are identified by their `key` field (e.g., `"ace-racer"`, `"aether-gazer"`)
- Use the game slug in URLs and API calls

### 3. **Package Identification**
- Packages can be found by either:
  - `SKU` (unique identifier, recommended)
  - `name` (package description)

## API Endpoints

### Get Game from External API
```
GET /games/external/:slug
```

**Example:**
```bash
curl http://localhost:3001/api/games/external/aether-gazer
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Aether Gazer",
    "key": "aether-gazer",
    "items": [
      {
        "name": "60 Shifting Flowers",
        "sku": "sB5iI_Qg-NE_A_PZ",
        "price": "28.76",
        "originalPrice": "0"
      }
    ],
    "inputs": [
      {
        "key": "uid",
        "title": "UID",
        "type": "text",
        "placeholder": "UID",
        "regex": null,
        "options": []
      }
    ]
  }
}
```

### Create Order (Using External Game Data)
```
POST /orders
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "gameId": "aether-gazer",
  "packageId": "sB5iI_Qg-NE_A_PZ",
  "userInput": {
    "uid": "123456"
  },
  "couponCode": "SAVE10",
  "email": "user@example.com"
}
```

**Parameters:**
- `gameId`: Game slug (string)
- `packageId`: Package SKU or name (string)
- `userInput`: Object with game-specific fields (uid, server, etc.)
- `couponCode` (optional): Applied coupon code
- `email` (optional): User email

**Response:**
```json
{
  "id": 12345,
  "userId": 1,
  "gameId": 1,
  "gameName": "Aether Gazer",
  "packageId": 1,
  "packageName": "60 Shifting Flowers",
  "packagePrice": 28.76,
  "uid": "123456",
  "status": "pending",
  "paymentMethod": null,
  "createdAt": "2026-04-16T10:30:00Z",
  "updatedAt": "2026-04-16T10:30:00Z"
}
```

## How It Works

### Flow Diagram
```
Frontend                    Backend                  External API
   |                           |                          |
   | GET /games/external/:slug |                          |
   |-------------------------->|  Fetch from cache       |
   |                           | or /products/list        |
   |                           |------------------------->|
   |                           |<-------------------------|
   |  Game with packages       |                          |
   | and input fields          |                          |
   |<--------------------------|                          |
   |                           |                          |
   | POST /orders              |                          |
   | (with gameId, packageId)  |                          |
   |-------------------------->|  Lookup in cache        |
   |                           | or fetch again           |
   |                           |------------------------->|
   |                           |<-------------------------|
   |  Order created            | Save to database         |
   |<--------------------------|                          |
   |                           |                          |
```

### Order Creation Process
1. Frontend sends game slug and package SKU/name
2. Backend fetches game data from external API (or cache)
3. Backend finds package in game data
4. Backend extracts game name and package details
5. Backend stores order in database with resolved details

## Migration from Database to External API

### What Changed
| Aspect | Before (DB) | After (External API) |
|--------|------------|----------------------|
| Games | From DB | From external API |
| Packages | From DB | From external API |
| Input Fields | From DB | From external API |
| Orders | Still saved in DB | Still saved in DB |
| Games Module | Database queries | API calls + caching |

### What Stays the Same
- Order creation and history
- User authentication
- Coupon validation
- Payment processing
- Database storage of transactions

### What's Deprecated
- `PostProcessGamePackageInput` endpoint (not needed)
- Local game/package management endpoints (external API handles this)
- Game import endpoints (kept for reference, not used)

## Services

### ExternalGameService
```typescript
export class ExternalGameService {
  // Fetch all games with 1-hour cache
  fetchGames(): Promise<ExternalGame[]>

  // Get specific game by slug
  fetchGameBySlug(slug: string): Promise<ExternalGame | null>

  // Find package in a game
  findPackageInGame(gameSlug: string, packageName: string): Promise<ExternalPackage | null>

  // Find package across all games by SKU
  findPackageBySku(sku: string): Promise<{ game: ExternalGame; package: ExternalPackage } | null>

  // Get input fields for a game
  getGameInputFields(gameSlug: string): Promise<ExternalInputField[]>

  // Clear cache manually
  clearCache(): void
}
```

## Performance Considerations

### Caching Strategy
- **Cache Duration**: 1 hour (3600000ms)
- **Cache Key**: No key needed, single in-memory cache
- **Invalidation**: Automatic after 1 hour

### Best Practices
1. **Don't call fetchGames() directly** — use game-specific methods
2. **Use SKU for package lookup** — more reliable than name
3. **Cache is per-server instance** — horizontal scaling will have separate caches
4. **External API is the source of truth** — don't store game data in DB

## Error Handling

### API Not Reachable
```json
{
  "statusCode": 503,
  "message": "Failed to fetch games: {error details}"
}
```

### Game Not Found
```json
{
  "statusCode": 404,
  "message": "Game \"invalid-slug\" not found"
}
```

### Package Not Found
```json
{
  "statusCode": 404,
  "message": "Package \"invalid-sku\" not found in game \"aether-gazer\""
}
```

## Troubleshooting

### Games Return Empty
- Check if external API URL is correct
- Verify network connectivity
- Check API response format matches expected structure

### Order Creation Fails
- Verify game slug is correct (case-sensitive)
- Use package SKU instead of name
- Ensure userInput includes required fields

### Slow Response Times
- Wait for cache to populate (first request is slowest)
- Subsequent requests within 1 hour are cached
- Consider increasing cache duration if needed

## Future Improvements

1. **Redis Caching** — Replace in-memory cache with Redis for multi-instance deployment
2. **Webhook Support** — Auto-invalidate cache when external API updates
3. **Partial Sync** — Sync only changed games instead of full refresh
4. **Metrics** — Track API call times, cache hit rates
5. **Fallback Data** — Keep a copy of game data as fallback if API is down
