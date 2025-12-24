# Scavengers API Documentation

Base URL: `/api`

## Response Format

All API responses follow a standardized envelope format:

```json
{
  "success": true,
  "data": { ... },
  "meta": { "timestamp": "2024-01-01T00:00:00.000Z" }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  },
  "meta": { "timestamp": "2024-01-01T00:00:00.000Z" }
}
```

## Authentication

Most endpoints require JWT authentication. Include the token in cookies (automatically handled by the browser) or as a Bearer token:

```
Authorization: Bearer <token>
```

---

## Endpoints

### Health & Diagnostics

#### GET /api/health

Check API health status.

**Response:**
```json
{
  "success": true,
  "data": { "status": "ok" }
}
```

#### GET /api/diagnostics

Get system diagnostics (development only).

**Response:**
```json
{
  "success": true,
  "data": {
    "database": { "connected": true, "userCount": 10, "huntCount": 5 },
    "environment": { "nodeEnv": "development" }
  }
}
```

---

### Authentication

#### POST /api/auth/register

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "displayName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "display_name": "John Doe"
    }
  }
}
```

**Rate Limit:** 5 requests per 15 minutes

---

#### POST /api/auth/login

Authenticate and receive a session token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "display_name": "John Doe"
    }
  }
}
```

Sets `auth_token` cookie on success.

**Rate Limit:** 10 requests per 15 minutes

---

#### GET /api/auth/me

Get current authenticated user.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "display_name": "John Doe",
      "avatar_url": "https://..."
    }
  }
}
```

---

#### GET /api/auth/profile

Get detailed user profile with statistics.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "stats": {
      "huntsCreated": 5,
      "huntsCompleted": 12,
      "totalPoints": 450
    }
  }
}
```

---

### CSRF Protection

#### GET /api/csrf

Get a CSRF token for form submissions.

**Response:**
```json
{
  "success": true,
  "data": { "token": "csrf_token_here" }
}
```

Include in subsequent requests as `X-CSRF-Token` header.

---

### Hunts

#### GET /api/hunts

List all public hunts.

**Query Parameters:**
- `status` (optional): Filter by status (draft, active, completed, archived)
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "hunts": [
      {
        "id": "uuid",
        "title": "Downtown Discovery",
        "description": "...",
        "difficulty": "medium",
        "status": "active",
        "challenge_count": 5,
        "participant_count": 12
      }
    ]
  }
}
```

---

#### POST /api/hunts

Create a new hunt.

**Authentication:** Required

**Request Body:**
```json
{
  "title": "My Scavenger Hunt",
  "description": "A fun adventure!",
  "difficulty": "medium",
  "isPublic": true,
  "challenges": [
    {
      "title": "Find the landmark",
      "description": "Take a photo of...",
      "points": 20,
      "verificationType": "photo"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hunt": { "id": "uuid", ... }
  }
}
```

---

#### GET /api/hunts/:id

Get hunt details with challenges.

**Response:**
```json
{
  "success": true,
  "data": {
    "hunt": {
      "id": "uuid",
      "title": "...",
      "challenges": [ ... ],
      "participants": [ ... ]
    }
  }
}
```

---

#### DELETE /api/hunts/:id

Delete a hunt (creator only).

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": { "message": "Hunt deleted successfully" }
}
```

---

#### POST /api/hunts/:id/join

Join a hunt as a participant.

**Authentication:** Optional (supports anonymous users)

**Request Body:**
```json
{
  "teamId": "uuid"  // Optional - join a specific team
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "participant": {
      "id": "uuid",
      "hunt_id": "uuid",
      "status": "joined",
      "score": 0
    }
  }
}
```

---

### Teams

#### GET /api/hunts/:id/teams

Get all teams for a hunt.

**Response:**
```json
{
  "success": true,
  "data": {
    "teams": [
      {
        "id": "uuid",
        "name": "Red Team",
        "color": "#FF0000",
        "memberCount": 3
      }
    ]
  }
}
```

---

#### POST /api/hunts/:id/teams

Create a new team.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Blue Team",
  "color": "#0000FF"
}
```

---

#### POST /api/hunts/:id/teams/:teamId/join

Join an existing team.

**Authentication:** Optional

---

### Submissions

#### POST /api/submissions

Submit a challenge completion.

**Request Body:**
```json
{
  "participantId": "uuid",
  "challengeId": "uuid",
  "submissionType": "photo",
  "submissionData": {
    "imageData": "base64...",
    "answer": "text answer"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "submission": {
      "id": "uuid",
      "status": "approved",  // or "pending" for photo
      "pointsAwarded": 20
    },
    "message": "Correct answer!"
  }
}
```

---

### Photo Review

#### GET /api/hunts/:id/review

Get pending photo submissions for review (hunt creator only).

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "submissions": [
      {
        "id": "uuid",
        "challengeTitle": "...",
        "imageData": "base64...",
        "submittedAt": "..."
      }
    ]
  }
}
```

---

#### POST /api/submissions/:id/review

Approve or reject a submission.

**Authentication:** Required (hunt creator only)

**Request Body:**
```json
{
  "action": "approve",  // or "reject"
  "points": 20  // Optional - override default points
}
```

---

### Leaderboard

#### GET /api/leaderboard

Get global leaderboard.

**Query Parameters:**
- `huntId` (optional): Filter by hunt
- `limit` (optional): Number of results

**Response:**
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "userId": "uuid",
        "displayName": "John",
        "score": 450,
        "completedChallenges": 15
      }
    ]
  }
}
```

---

#### GET /api/leaderboard/:huntId/stream

Real-time leaderboard updates via Server-Sent Events.

**Response:** SSE stream

```
event: leaderboard
data: {"leaderboard": [...]}

event: update
data: {"userId": "uuid", "newScore": 100}
```

---

### Templates

#### GET /api/templates

List available hunt templates.

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "uuid",
        "name": "Office Party Hunt",
        "description": "...",
        "challengeCount": 10
      }
    ]
  }
}
```

---

#### POST /api/templates/:id/use

Create a new hunt from a template.

**Authentication:** Required

**Request Body:**
```json
{
  "title": "My Office Party",
  "customizations": { ... }
}
```

---

### AI Generation

#### POST /api/generate

Generate hunt challenges using AI.

**Authentication:** Required

**Request Body:**
```json
{
  "theme": "nature",
  "location": "Central Park",
  "difficulty": "medium",
  "challengeCount": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "challenges": [
      {
        "title": "...",
        "description": "...",
        "points": 20,
        "verificationType": "photo"
      }
    ]
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid request data |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Server error |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| POST /api/auth/register | 5 per 15 min |
| POST /api/auth/login | 10 per 15 min |
| POST /api/generate | 10 per hour |
| All other endpoints | 100 per minute |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
