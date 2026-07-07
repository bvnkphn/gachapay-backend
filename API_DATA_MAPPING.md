# External API to Prisma Schema Mapping

## Overview
This document maps the external game top-up API data structure to the Prisma database schema.

## Data Structure Mapping

### 1. Game (Root Object)

**External Format:**
```json
{
  "name": "Ace Racer",
  "key": "ace-racer",
  "items": [...],
  "inputs": [...]
}
```

**Mapped to `Game` Model:**
| External Field | Prisma Field | Type | Notes |
|---|---|---|---|
| `name` | `name` | String | Game title |
| `key` | `slug` | String | URL-friendly identifier, unique |
| (default) | `isActive` | Boolean | Set to `true` on import |
| (default) | `label` | GameLabel | Default: NONE (HOT, NEW, SALE, NONE) |
| (auto) | `id` | BigInt | Auto-increment |
| (auto) | `createdAt` | DateTime | Auto-set |
| (auto) | `updatedAt` | DateTime | Auto-set |

**Example:**
```typescript
const game = await prisma.game.create({
  data: {
    name: "Ace Racer",
    slug: "ace-racer",
    isActive: true,
    label: "NONE"
  }
});
```

---

### 2. Game Package (items array)

**External Format:**
```json
{
  "name": "60 + 5 Tokens",
  "sku": "T8XLlOEaSLWN-ytz",
  "price": "27.5",
  "originalPrice": "0"
}
```

**Mapped to `GamePackage` Model:**
| External Field | Prisma Field | Type | Notes |
|---|---|---|---|
| `name` | `name` | String | Package description |
| `sku` | `sku` | String | **UNIQUE** identifier |
| `price` | `price` | Decimal(10,2) | Current price (parsed from string) |
| `originalPrice` | `originalPrice` | Decimal(10,2) | Original price (parsed from string, default 0) |
| (calculated) | `discount` | Int | Can be calculated: ((originalPrice - price) / originalPrice) * 100 |
| (default) | `isActive` | Boolean | Set to `true` on import |
| (auto) | `gameId` | BigInt | Foreign key to Game |

**Example:**
```typescript
const pkg = await prisma.gamePackage.create({
  data: {
    gameId: game.id,
    sku: "T8XLlOEaSLWN-ytz",
    name: "60 + 5 Tokens",
    price: new Decimal("27.5"),
    originalPrice: new Decimal("0"),
    isActive: true
  }
});
```

---

### 3. Game Input Field (inputs array)

**External Format:**
```json
{
  "key": "uid",
  "title": "UID",
  "type": "text",
  "placeholder": "UID",
  "regex": null,
  "options": []
}
```

**Mapped to `GameInputField` Model:**
| External Field | Prisma Field | Type | Notes |
|---|---|---|---|
| `key` | `key` | String | Field identifier (uid, server, password, etc) |
| `title` | `label` | String | Display label for UI |
| `type` | `type` | String | text, email, number, password, select |
| `placeholder` | `placeholder` | String | Input placeholder text |
| `regex` | `regex` | String | Validation regex pattern (null = no validation) |
| (default) | `required` | Boolean | Set to `true` on import |
| (default) | `helpText` | String | Null (can be added manually) |
| (default) | `order` | Int | Default 0 (ordering for display) |
| (default) | `isActive` | Boolean | Set to `true` on import |
| (auto) | `gameId` | BigInt | Foreign key to Game |

**Unique Constraint:** `(gameId, key)` — One field per game

**Example:**
```typescript
const fieldUID = await prisma.gameInputField.create({
  data: {
    gameId: game.id,
    key: "uid",
    label: "UID",
    type: "text",
    placeholder: "UID",
    regex: null,
    required: true,
    isActive: true
  }
});
```

---

### 4. Game Input Field Option (inputs[].options array)

**External Format:**
```json
{
  "label": "韓國分站/KOREA/한국/サブ会場-韓国",
  "value": "韓國分站/KOREA/한국/サブ会場-韓国"
}
```

**Mapped to `GameInputFieldOption` Model:**
| External Field | Prisma Field | Type | Notes |
|---|---|---|---|
| `label` | `label` | String | Display text in dropdown/select |
| `value` | `value` | String | Actual value sent when form submitted |
| (auto index) | `order` | Int | Index in options array |
| (default) | `isActive` | Boolean | Set to `true` on import |
| (auto) | `fieldId` | BigInt | Foreign key to GameInputField |

**Unique Constraint:** `(fieldId, value)` — One value per field

**Example:**
```typescript
const option = await prisma.gameInputFieldOption.create({
  data: {
    fieldId: fieldUID.id,
    label: "韓國分站/KOREA",
    value: "韓國分站/KOREA/한국/サブ会場-韓国",
    order: 0
  }
});
```

---

## Import Flow

```
External API Data
    ↓
[GameImportService.importGames()]
    ↓
1. Upsert Game (by slug)
2. Upsert GamePackage (by sku)
3. Upsert GameInputField (by gameId + key)
4. Upsert GameInputFieldOption (by fieldId + value)
    ↓
Database Updated
```

## Usage Example

```typescript
// 1. Load external data (from API or JSON file)
const externalGames: ExternalGame[] = [...];

// 2. Import into database
await gameImportService.importGames(externalGames);

// 3. Query imported data
const game = await prisma.game.findUnique({
  where: { slug: "ace-racer" },
  include: {
    packages: true,
    inputFields: {
      include: { options: true }
    }
  }
});
```

## Key Differences from External API

| Aspect | External API | Prisma Schema |
|---|---|---|
| Package identifier | `sku` (string) | `sku` (unique string) + `id` (BigInt) |
| Pricing | `price`, `originalPrice` strings | Both stored as `Decimal` |
| Input field validation | `regex` nullable | `regex` nullable string |
| Input options | arrays | Stored with `order` field for display |
| Uniqueness | Multiple games can have same field names | Fields unique per game (gameId + key) |

## Migration Required

To apply the schema changes, run:
```bash
npx prisma migrate dev --name add_sku_and_original_price
```

This will:
- Add `sku` (unique) field to GamePackage
- Add `originalPrice` field to GamePackage
- Add unique constraint `(fieldId, value)` to GameInputFieldOption
