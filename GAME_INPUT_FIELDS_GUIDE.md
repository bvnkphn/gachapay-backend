# Dynamic Player Field Structure

This document explains how the Dynamic Player Field system works for storing and managing game-specific input fields.

## Overview

The system allows each game to have its own set of input fields (like User ID, Zone ID, Server, Password, etc.) that players must fill in when making a top-up purchase.

## Database Models

### GameInputField
Stores the definition of input fields for a game.

```typescript
{
  id: BigInt              // UUID
  gameId: BigInt          // Reference to Game
  key: string             // Field identifier (e.g., "uid", "server", "password")
  label: string           // Display label (e.g., "User ID", "Server", "Password")
  placeholder: string     // Placeholder text for input
  type: string            // Field type: text, email, number, password, select
  required: boolean       // Whether field is required
  regex: string          // Validation regex pattern (optional)
  helpText: string       // Help text to display below field
  order: number          // Display order (0-based)
  isActive: boolean      // Active/inactive status
  createdAt: DateTime
  updatedAt: DateTime
}
```

### GameInputFieldOption
Stores predefined options for select-type fields.

```typescript
{
  id: BigInt              // UUID
  fieldId: BigInt         // Reference to GameInputField
  label: string           // Display text (e.g., "Korea Server")
  value: string           // Actual value to submit
  order: number          // Display order
  isActive: boolean      // Active/inactive status
  createdAt: DateTime
}
```

## Example Data Structure

### Game: Ace Racer

```json
{
  "game": {
    "id": 1,
    "name": "Ace Racer",
    "slug": "ace-racer",
    "fields": [
      {
        "id": 1,
        "key": "uid",
        "label": "User ID",
        "placeholder": "Enter your User ID",
        "type": "text",
        "required": true,
        "regex": "^[0-9]+$",
        "helpText": "Your game user ID"
      },
      {
        "id": 2,
        "key": "server",
        "label": "Server",
        "placeholder": "Select your server",
        "type": "select",
        "required": true,
        "helpText": "Choose the server you play on",
        "options": [
          { "value": "korea", "label": "Korea" },
          { "value": "japan", "label": "Japan" },
          { "value": "asia", "label": "Asia" },
          { "value": "global", "label": "Global" }
        ]
      }
    ]
  }
}
```

## API Endpoints

### Get Game Input Fields
**GET** `/api/games/:gameId/input-fields`

Returns all input fields for a game:

```json
{
  "data": [
    {
      "id": 1,
      "gameId": 1,
      "key": "uid",
      "label": "User ID",
      "type": "text",
      "required": true,
      "order": 0,
      "options": []
    },
    {
      "id": 2,
      "gameId": 1,
      "key": "server",
      "label": "Server",
      "type": "select",
      "required": true,
      "order": 1,
      "options": [
        { "id": 1, "label": "Korea", "value": "korea" },
        { "id": 2, "label": "Japan", "value": "japan" }
      ]
    }
  ]
}
```

### Create Input Field
**POST** `/api/games/:gameId/input-fields`

```json
{
  "key": "uid",
  "label": "User ID",
  "placeholder": "Enter your User ID",
  "type": "text",
  "required": true,
  "regex": "^[0-9]+$",
  "helpText": "Your game user ID",
  "order": 0
}
```

### Add Field Options
**POST** `/api/games/input-fields/:fieldId/options`

```json
{
  "label": "Korea Server",
  "value": "korea",
  "order": 0
}
```

### Get Game with Fields
**GET** `/api/games/:slug`

Returns the full game data including input fields:

```json
{
  "data": {
    "id": 1,
    "name": "Ace Racer",
    "slug": "ace-racer",
    "packages": [
      { "id": 1, "name": "60 + 5 Tokens", "price": 27.5 },
      { "id": 2, "name": "250 + 20 Tokens", "price": 105.62 }
    ],
    "fields": [
      { "key": "uid", "label": "User ID", "type": "text", "required": true },
      { "key": "server", "label": "Server", "type": "select", "options": [...] }
    ]
  }
}
```

## Field Types

- **text**: Simple text input
- **email**: Email input with validation
- **number**: Numeric input only
- **password**: Password input (masked)
- **select**: Dropdown with predefined options (stored in GameInputFieldOption)

## Usage in Frontend

When rendering a game page, fields are displayed in the order specified by the `order` field:

```typescript
// Example from game page
{game.fields
  .sort((a, b) => a.order - b.order)
  .map((field) => (
    <Input
      key={field.key}
      type={field.type}
      label={field.label}
      placeholder={field.placeholder}
      required={field.required}
      list={field.options?.length > 0 ? `options-${field.key}` : undefined}
    />
  ))}
```

## Creating Default Fields for a Game

When adding a new game to the database, create input fields like this:

```sql
INSERT INTO game_input_fields (game_id, key, label, placeholder, type, required, "order")
VALUES
  (1, 'uid', 'User ID', 'Enter your User ID', 'text', true, 0),
  (1, 'server', 'Server', 'Select your server', 'select', true, 1),
  (1, 'password', 'Password', 'Enter game password (if required)', 'password', false, 2);

INSERT INTO game_input_field_options (field_id, label, value, "order")
VALUES
  (2, 'Korea', 'korea', 0),
  (2, 'Japan', 'japan', 1),
  (2, 'Asia', 'asia', 2),
  (2, 'Global', 'global', 3);
```

## Validation

- **regex**: Use JavaScript regex patterns for custom validation
- Example: `^[A-Za-z0-9_]+$` for alphanumeric + underscore

## Notes

- Fields and options can be soft-deleted by setting `isActive` to `false`
- Display order is determined by the `order` field (ascending)
- Required fields are marked with asterisk (*) in the UI
- Help text appears below the field for user guidance
