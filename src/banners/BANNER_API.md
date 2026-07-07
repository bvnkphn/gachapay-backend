# Banner Management API Documentation

## Overview
The Banner API allows you to manage promotional banners for the Gachapay platform. Banners can display advertisements, promotions, or links to specific games and can be easily managed through admin endpoints.

## Features
- ✅ Get all active banners for frontend display
- ✅ Create, read, update, and delete banners (admin only)
- ✅ Soft delete with `isActive` flag
- ✅ Hard delete capability
- ✅ Banner ordering/positioning system
- ✅ Toggle banner active status
- ✅ UUID-based unique identification

## Database Schema

### Banner Model
```prisma
model Banner {
  id          BigInt   @id @default(autoincrement())
  uuid        String   @unique @default(uuid()) @db.Char(36)
  image       String   @db.VarChar(500)        // Banner image URL
  title       String?  @db.VarChar(255)        // Optional title/name
  description String?  @db.Text                // Optional description
  redirectUrl String   @db.VarChar(500)        // Destination link (ad, promo, game)
  order       Int      @default(0)             // Display order
  isActive    Boolean  @default(true)          // Active status
  createdAt   DateTime @default(now()) @db.Timestamp(0)
  updatedAt   DateTime @updatedAt @db.Timestamp(0)
}
```

## API Endpoints

### Public Endpoints (No Authentication Required)

#### Get All Active Banners
```
GET /banners
```
**Description:** Retrieve all active banners sorted by display order

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "image": "https://example.com/banner1.jpg",
      "title": "Summer Promotion",
      "description": "Get 50% off on all games",
      "redirectUrl": "https://example.com/summer-sale",
      "order": 0,
      "isActive": true,
      "createdAt": "2026-04-01T02:48:56.000Z",
      "updatedAt": "2026-04-01T02:48:56.000Z"
    }
  ],
  "message": "Banners retrieved successfully"
}
```

#### Get Banner by UUID
```
GET /banners/:uuid
```
**Description:** Retrieve a specific banner by UUID

**Parameters:**
- `uuid` (string, required): Banner UUID

**Response:**
```json
{
  "data": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "image": "https://example.com/banner1.jpg",
    "title": "Summer Promotion",
    "description": "Get 50% off on all games",
    "redirectUrl": "https://example.com/summer-sale",
    "order": 0,
    "isActive": true,
    "createdAt": "2026-04-01T02:48:56.000Z",
    "updatedAt": "2026-04-01T02:48:56.000Z"
  },
  "message": "Banner retrieved successfully"
}
```

### Admin Endpoints (Requires JWT Token + ADMIN Role)

#### Get All Banners (Including Inactive)
```
GET /banners/admin/list
```
**Description:** Retrieve all banners including inactive ones (admin only)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "image": "https://example.com/banner1.jpg",
      "title": "Summer Promotion",
      "description": "Get 50% off on all games",
      "redirectUrl": "https://example.com/summer-sale",
      "order": 0,
      "isActive": true,
      "createdAt": "2026-04-01T02:48:56.000Z",
      "updatedAt": "2026-04-01T02:48:56.000Z"
    },
    {
      "id": 2,
      "uuid": "660e8400-e29b-41d4-a716-446655440001",
      "image": "https://example.com/banner2.jpg",
      "title": "Old Campaign",
      "redirectUrl": "https://example.com/old",
      "order": 1,
      "isActive": false,
      "createdAt": "2026-03-15T10:30:00.000Z",
      "updatedAt": "2026-03-20T14:22:00.000Z"
    }
  ],
  "message": "All banners retrieved successfully"
}
```

#### Create Banner
```
POST /banners
```
**Description:** Create a new banner (admin only)

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "image": "https://example.com/banner.jpg",
  "title": "New Game Launch",
  "description": "Check out our latest game!",
  "redirectUrl": "https://example.com/new-game",
  "order": 0,
  "isActive": true
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "image": "https://example.com/banner.jpg",
    "title": "New Game Launch",
    "description": "Check out our latest game!",
    "redirectUrl": "https://example.com/new-game",
    "order": 0,
    "isActive": true,
    "createdAt": "2026-04-01T02:48:56.000Z",
    "updatedAt": "2026-04-01T02:48:56.000Z"
  },
  "message": "Banner created successfully"
}
```

#### Update Banner
```
PATCH /banners/:id
```
**Description:** Update an existing banner (admin only)

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Parameters:**
- `id` (string, required): Banner ID

**Request Body:** (all fields optional)
```json
{
  "image": "https://example.com/new-banner.jpg",
  "title": "Updated Title",
  "description": "Updated description",
  "redirectUrl": "https://example.com/updated-link",
  "order": 1,
  "isActive": true
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "image": "https://example.com/new-banner.jpg",
    "title": "Updated Title",
    "description": "Updated description",
    "redirectUrl": "https://example.com/updated-link",
    "order": 1,
    "isActive": true,
    "createdAt": "2026-04-01T02:48:56.000Z",
    "updatedAt": "2026-04-01T03:00:00.000Z"
  },
  "message": "Banner updated successfully"
}
```

#### Toggle Banner Active Status
```
PATCH /banners/:id/toggle
```
**Description:** Enable or disable a banner (admin only)

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Parameters:**
- `id` (string, required): Banner ID

**Request Body:**
```json
{
  "isActive": false
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "image": "https://example.com/banner.jpg",
    "title": "New Game Launch",
    "redirectUrl": "https://example.com/new-game",
    "order": 0,
    "isActive": false,
    "createdAt": "2026-04-01T02:48:56.000Z",
    "updatedAt": "2026-04-01T03:05:00.000Z"
  },
  "message": "Banner status updated successfully"
}
```

#### Update Banner Order
```
PATCH /banners/:id/order
```
**Description:** Update banner display order (admin only)

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Parameters:**
- `id` (string, required): Banner ID

**Request Body:**
```json
{
  "order": 2
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "image": "https://example.com/banner.jpg",
    "title": "New Game Launch",
    "redirectUrl": "https://example.com/new-game",
    "order": 2,
    "isActive": true,
    "createdAt": "2026-04-01T02:48:56.000Z",
    "updatedAt": "2026-04-01T03:10:00.000Z"
  },
  "message": "Banner order updated successfully"
}
```

#### Delete Banner (Soft Delete)
```
DELETE /banners/:id
```
**Description:** Delete banner (soft delete - sets isActive to false) (admin only)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Parameters:**
- `id` (string, required): Banner ID

**Response:** `200 OK`
```json
{
  "message": "Banner deleted successfully"
}
```

#### Hard Delete Banner (Permanent)
```
DELETE /banners/:id/hard-delete
```
**Description:** Permanently delete banner from database (admin only - use with caution)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Parameters:**
- `id` (string, required): Banner ID

**Response:** `200 OK`
```json
{
  "message": "Banner permanently deleted"
}
```

## Usage Examples

### Frontend: Display Banners
```typescript
// Fetch all active banners
const response = await fetch('http://localhost:3000/banners');
const { data: banners } = await response.json();

// Render banners
banners.forEach(banner => {
  console.log(`Banner: ${banner.title}`);
  console.log(`Image: ${banner.image}`);
  console.log(`Redirect: ${banner.redirectUrl}`);
});
```

### Admin: Create Banner
```bash
curl -X POST http://localhost:3000/banners \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "https://example.com/summer-sale.jpg",
    "title": "Summer Sale",
    "description": "50% off all games",
    "redirectUrl": "https://example.com/summer-sale",
    "order": 0,
    "isActive": true
  }'
```

### Admin: Update Banner
```bash
curl -X PATCH http://localhost:3000/banners/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Banner Title",
    "order": 1
  }'
```

## Error Handling

### Validation Errors
```json
{
  "statusCode": 400,
  "message": ["image should not be empty", "redirectUrl should not be empty"],
  "error": "Bad Request"
}
```

### Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### Forbidden (Not Admin)
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### Not Found
```json
{
  "statusCode": 404,
  "message": "Banner not found",
  "error": "Not Found"
}
```

## Best Practices

1. **Image URLs**: Use CDN or cloud storage URLs for banner images
2. **Redirect URLs**: Ensure redirect URLs are properly validated
3. **Order Field**: Use consistent ordering system (e.g., 0, 1, 2...)
4. **Soft Delete**: Use soft delete for audit trail purposes
5. **Banner Rotation**: Use the order field to control banner display rotation

## Frontend Integration Example (React Component)

```typescript
import { useEffect, useState } from 'react';

export function BannerSlider() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const response = await fetch('http://api.example.com/banners');
      const { data } = await response.json();
      setBanners(data);
    } catch (error) {
      console.error('Failed to fetch banners:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="banner-slider">
      {banners.map((banner) => (
        <a
          key={banner.id}
          href={banner.redirectUrl}
          className="banner-item"
        >
          <img src={banner.image} alt={banner.title} />
          {banner.title && <h2>{banner.title}</h2>}
          {banner.description && <p>{banner.description}</p>}
        </a>
      ))}
    </div>
  );
}
```

## Installation & Setup

1. The migration has been automatically applied to the database
2. The Banner module is already imported in `app.module.ts`
3. Start your NestJS server normally
4. Banners API will be available at `/banners` endpoint

## Notes

- All timestamps are in UTC
- Banner UUIDs are auto-generated if not provided
- The `order` field defaults to 0
- Active banners are automatically filtered for public API
- Admin endpoints require valid JWT token with ADMIN role
