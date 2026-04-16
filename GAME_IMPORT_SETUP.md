# Game Data Import Setup Guide

## What Was Added

### 1. Schema Changes
- Added `sku` (unique) field to `GamePackage` model
- Added `originalPrice` field to `GamePackage` model
- Added unique constraint `(fieldId, value)` to `GameInputFieldOption`

### 2. Services
- **`GameImportService`** — Transforms external API data to Prisma models
- **`GameImportController`** — Provides HTTP endpoints for import and schema reference

### 3. Documentation
- **`API_DATA_MAPPING.md`** — Comprehensive mapping guide
- **`sample-games-import.json`** — Sample import data format

## Step 1: Create Migration

Run this command to create the migration for schema changes:

```bash
cd gachapay-member-api
npx prisma migrate dev --name add_sku_and_original_price
```

This will:
1. Create a new migration file in `prisma/migrations/`
2. Apply the migration to your database
3. Regenerate the Prisma client

## Step 2: Test the Import Endpoint

### Option A: Using Swagger UI
1. Start your API: `npm run start:dev`
2. Open: `http://localhost:3001/api/docs`
3. Navigate to "**Game Management**" section
4. Find `POST /games/import` endpoint
5. Click "Try it out"
6. Paste the content from `sample-games-import.json` into the request body
7. Click "Execute"

### Option B: Using cURL

```bash
curl -X POST http://localhost:3001/api/games/import \
  -H "Content-Type: application/json" \
  -d @sample-games-import.json
```

### Option C: Using Node.js

```typescript
const data = require('./sample-games-import.json');

const response = await fetch('http://localhost:3001/api/games/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

console.log(await response.json());
```

## Step 3: Verify Import

Query the imported data:

```bash
# Get a specific game
curl http://localhost:3001/api/games/ace-racer

# Get all games
curl http://localhost:3001/api/games
```

## Step 4: View Mapping Schema

To see the field mappings reference:

```bash
curl http://localhost:3001/api/games/mapping-schema
```

## Data Structure Reference

### External API Format
```json
{
  "name": "Game Name",
  "key": "game-slug",
  "items": [
    {
      "name": "Package Name",
      "sku": "unique-sku",
      "price": "27.5",
      "originalPrice": "30"
    }
  ],
  "inputs": [
    {
      "key": "uid",
      "title": "User ID",
      "type": "text",
      "placeholder": "Enter UID",
      "regex": null,
      "options": []
    }
  ]
}
```

### Mapped to Prisma Database
- **Game**: `name`, `slug` (from `key`)
- **GamePackage**: `sku`, `name`, `price`, `originalPrice`
- **GameInputField**: `key`, `label` (from `title`), `type`, `placeholder`, `regex`
- **GameInputFieldOption**: `label`, `value` (for select inputs)

## Troubleshooting

### Error: "Cannot find module 'decimal.js'"
Make sure you ran `npm install decimal.js` in the API folder.

### Error: "SKU already exists"
The import uses upsert, so duplicate SKUs will be updated. To force reimport, delete existing games first or use different SKUs.

### Migration Error: "Cannot create unique index"
If a field already has non-unique data, the migration will fail. You may need to manually clean up the database or modify the migration.

### Import Shows 0 Games Imported
Check that:
1. The JSON is valid format
2. All required fields are present (`name`, `key`, `items`, `inputs`)
3. The API returned a success message

## Next Steps

1. **Load Real Data**: Replace `sample-games-import.json` with actual data from your external API
2. **Setup Auto-Import**: Create a cron job or scheduled task to periodically sync data
3. **Add Categories**: Manually assign games to categories in the admin panel
4. **Update Images**: Add game images by updating the `Game.image` field
5. **Customize Fields**: Edit input field help text and validation rules as needed

## Files Created

```
gachapay-member-api/
├── src/games/
│   ├── game-import.service.ts      (NEW)
│   ├── game-import.controller.ts   (NEW)
│   └── games.module.ts              (UPDATED)
├── prisma/
│   ├── schema.prisma                (UPDATED)
│   └── migrations/
│       └── [timestamp]_add_sku_and_original_price/
│           ├── migration.sql        (AUTO-GENERATED)
│           └── migration_lock.toml  (AUTO-GENERATED)
├── API_DATA_MAPPING.md              (NEW)
└── sample-games-import.json         (NEW)
```

## API Endpoints Added

- `POST /games/import` — Import games from external API data
- `GET /games/mapping-schema` — Get field mapping reference
