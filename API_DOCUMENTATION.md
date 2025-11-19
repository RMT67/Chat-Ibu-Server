# Chat Ibu-Ibu API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [REST API Endpoints](#rest-api-endpoints)
   - [Users](#users)
   - [Rooms](#rooms)
   - [Chats](#chats)
5. [Socket.IO Events](#socketio-events)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Security](#security)

---

## Overview

Chat Ibu-Ibu adalah RESTful API server untuk aplikasi chat komunitas ibu-ibu dengan fitur real-time messaging menggunakan Socket.IO. API ini menggunakan JWT untuk authentication dan PostgreSQL sebagai database.

**Version:** 1.0.0  
**Base URL:** `http://localhost:3000/api`

---

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

---

## Authentication

API menggunakan JWT (JSON Web Token) untuk authentication. Token harus dikirim di header setiap request yang memerlukan authentication.

### Getting Token

Token diperoleh setelah **register** atau **login** berhasil.

### Using Token

Setelah mendapatkan token, kirimkan di header setiap request:

```
Authorization: Bearer <your-token>
```

**Example:**
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  http://localhost:3000/api/users
```

### Token Expiration

Token berlaku selama **24 jam** sejak diterbitkan.

---

## REST API Endpoints

### Users

#### Register User

Mendaftarkan user baru ke sistem.

**Endpoint:** `POST /api/users/register`  
**Authentication:** Not required

**Request Body:**
```json
{
  "name": "Ibu Siti",
  "email": "siti@example.com",
  "password": "password123"
}
```

**Response (201 Created):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Ibu Siti",
    "email": "siti@example.com",
    "photoUrl": null,
    "isOnline": false,
    "role": "user"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Email already registered
- `400 Bad Request` - Validation error

**Validation Rules:**
- `name`: Required, not empty
- `email`: Required, valid email format, unique
- `password`: Required, minimum 6 characters

---

#### Login User

Login dengan email dan password.

**Endpoint:** `POST /api/users/login`  
**Authentication:** Not required

**Request Body:**
```json
{
  "email": "siti@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Ibu Siti",
    "email": "siti@example.com",
    "photoUrl": null,
    "isOnline": false,
    "role": "user"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid email or password

---

#### Get All Users

Mendapatkan daftar semua users dengan pagination dan filter.

**Endpoint:** `GET /api/users`  
**Authentication:** Required

**Query Parameters:**
- `isOnline` (optional): Filter by online status (`true` or `false`)
- `limit` (optional): Number of results per page (default: 50)
- `offset` (optional): Number of results to skip (default: 0)

**Example:**
```
GET /api/users?isOnline=true&limit=20&offset=0
```

**Response (200 OK):**
```json
{
  "users": [
    {
      "id": 1,
      "name": "Ibu Siti",
      "email": "siti@example.com",
      "photoUrl": null,
      "isOnline": true,
      "lastSeen": "2025-01-18T10:00:00.000Z",
      "role": "user",
      "createdAt": "2025-01-18T09:00:00.000Z"
    }
  ],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token

---

#### Get User By ID

Mendapatkan detail user berdasarkan ID.

**Endpoint:** `GET /api/users/:id`  
**Authentication:** Required

**Path Parameters:**
- `id` (required): User ID

**Example:**
```
GET /api/users/1
```

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "name": "Ibu Siti",
    "email": "siti@example.com",
    "photoUrl": null,
    "isOnline": true,
    "lastSeen": "2025-01-18T10:00:00.000Z",
    "role": "user",
    "createdAt": "2025-01-18T09:00:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - User not found

---

#### Update User

Update profil user (hanya bisa update profil sendiri).

**Endpoint:** `PUT /api/users/:id`  
**Authentication:** Required

**Path Parameters:**
- `id` (required): User ID

**Request Body:**
```json
{
  "name": "Ibu Siti Updated",
  "photoUrl": "https://example.com/photo.jpg"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "name": "Ibu Siti Updated",
    "email": "siti@example.com",
    "photoUrl": "https://example.com/photo.jpg",
    "isOnline": true,
    "role": "user"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - Cannot update other user's profile
- `404 Not Found` - User not found

---

#### Update Online Status

Update status online/offline user (hanya bisa update status sendiri).

**Endpoint:** `PATCH /api/users/:id/online-status`  
**Authentication:** Required

**Path Parameters:**
- `id` (required): User ID

**Request Body:**
```json
{
  "isOnline": true
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "isOnline": true,
    "lastSeen": "2025-01-18T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - Cannot update other user's status
- `404 Not Found` - User not found

---

### Rooms

#### Get All Rooms

Mendapatkan daftar semua rooms dengan pagination dan filter.

**Endpoint:** `GET /api/rooms`  
**Authentication:** Required

**Query Parameters:**
- `isActive` (optional): Filter by active status (`true` or `false`)
- `limit` (optional): Number of results per page (default: 50)
- `offset` (optional): Number of results to skip (default: 0)

**Example:**
```
GET /api/rooms?isActive=true&limit=20&offset=0
```

**Response (200 OK):**
```json
{
  "rooms": [
    {
      "id": 1,
      "name": "Diskusi MPASI",
      "description": "Diskusi tentang makanan pendamping ASI",
      "topic": "MPASI Pertama",
      "createdBy": 1,
      "isActive": true,
      "createdAt": "2025-01-18T10:00:00.000Z",
      "updatedAt": "2025-01-18T10:00:00.000Z",
      "creator": {
        "id": 1,
        "name": "Ibu Siti",
        "photoUrl": null
      }
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token

---

#### Get Room By ID

Mendapatkan detail room berdasarkan ID.

**Endpoint:** `GET /api/rooms/:id`  
**Authentication:** Required

**Path Parameters:**
- `id` (required): Room ID

**Example:**
```
GET /api/rooms/1
```

**Response (200 OK):**
```json
{
  "room": {
    "id": 1,
    "name": "Diskusi MPASI",
    "description": "Diskusi tentang makanan pendamping ASI",
    "topic": "MPASI Pertama",
    "createdBy": 1,
    "isActive": true,
    "createdAt": "2025-01-18T10:00:00.000Z",
    "updatedAt": "2025-01-18T10:00:00.000Z",
    "creator": {
      "id": 1,
      "name": "Ibu Siti",
      "photoUrl": null
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Room not found

---

#### Generate Room Content (AI)

Generate konten room menggunakan AI (nama, deskripsi, topik). Hanya untuk admin.

**Endpoint:** `POST /api/rooms/generate-content`  
**Authentication:** Required (Admin only)

**Request Body:** None

**Response (200 OK):**
```json
{
  "name": "Tips Pengasuhan Anak",
  "description": "Diskusi tentang berbagai tips dan trik dalam mengasuh anak",
  "topic": "Pengasuhan Anak"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - Admin access required
- `429 Too Many Requests` - Rate limit exceeded (5 requests per minute)

**Rate Limiting:**
- Maximum 5 requests per minute per user

---

#### Create Room

Membuat room baru. Hanya untuk admin.

**Endpoint:** `POST /api/rooms`  
**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "name": "Diskusi MPASI",
  "description": "Diskusi tentang makanan pendamping ASI",
  "topic": "MPASI Pertama"
}
```

**Validation Rules:**
- `name`: Required, not empty
- `description`: Optional
- `topic`: Optional

**Response (201 Created):**
```json
{
  "room": {
    "id": 1,
    "name": "Diskusi MPASI",
    "description": "Diskusi tentang makanan pendamping ASI",
    "topic": "MPASI Pertama",
    "createdBy": 1,
    "isActive": true,
    "createdAt": "2025-01-18T10:00:00.000Z",
    "updatedAt": "2025-01-18T10:00:00.000Z",
    "creator": {
      "id": 1,
      "name": "Ibu Siti",
      "photoUrl": null
    }
  }
}
```

**Note:** Room akan otomatis memiliki opening message yang di-generate oleh AI.

**Error Responses:**
- `400 Bad Request` - Room name is required
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - Admin access required

---

#### Update Room

Update room. Hanya untuk admin.

**Endpoint:** `PUT /api/rooms/:id`  
**Authentication:** Required (Admin only)

**Path Parameters:**
- `id` (required): Room ID

**Request Body:**
```json
{
  "name": "Diskusi MPASI Updated",
  "description": "Updated description",
  "topic": "Updated topic",
  "isActive": true
}
```

**Response (200 OK):**
```json
{
  "room": {
    "id": 1,
    "name": "Diskusi MPASI Updated",
    "description": "Updated description",
    "topic": "Updated topic",
    "createdBy": 1,
    "isActive": true,
    "createdAt": "2025-01-18T10:00:00.000Z",
    "updatedAt": "2025-01-18T11:00:00.000Z",
    "creator": {
      "id": 1,
      "name": "Ibu Siti",
      "photoUrl": null
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - Admin access required
- `404 Not Found` - Room not found

---

#### Delete Room

Soft delete room (set isActive to false). Hanya untuk admin.

**Endpoint:** `DELETE /api/rooms/:id`  
**Authentication:** Required (Admin only)

**Path Parameters:**
- `id` (required): Room ID

**Response (200 OK):**
```json
{
  "message": "Room deactivated successfully"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - Admin access required
- `404 Not Found` - Room not found

---

### Chats

#### Get All Chats

Mendapatkan daftar semua chats dengan pagination dan filter.

**Endpoint:** `GET /api/chats`  
**Authentication:** Required

**Query Parameters:**
- `roomId` (optional): Filter by room ID
- `limit` (optional): Number of results per page (default: 50)
- `offset` (optional): Number of results to skip (default: 0)

**Example:**
```
GET /api/chats?roomId=1&limit=20&offset=0
```

**Response (200 OK):**
```json
{
  "chats": [
    {
      "id": 1,
      "message": "Halo semua!",
      "UserId": 1,
      "RoomId": 1,
      "createdAt": "2025-01-18T10:00:00.000Z",
      "updatedAt": "2025-01-18T10:00:00.000Z",
      "User": {
        "id": 1,
        "name": "Ibu Siti",
        "photoUrl": null
      },
      "Room": {
        "id": 1,
        "name": "Diskusi MPASI"
      }
    }
  ],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token

---

#### Get Chat By ID

Mendapatkan detail chat berdasarkan ID.

**Endpoint:** `GET /api/chats/:id`  
**Authentication:** Required

**Path Parameters:**
- `id` (required): Chat ID

**Example:**
```
GET /api/chats/1
```

**Response (200 OK):**
```json
{
  "chat": {
    "id": 1,
    "message": "Halo semua!",
    "UserId": 1,
    "RoomId": 1,
    "createdAt": "2025-01-18T10:00:00.000Z",
    "updatedAt": "2025-01-18T10:00:00.000Z",
    "User": {
      "id": 1,
      "name": "Ibu Siti",
      "photoUrl": null
    },
    "Room": {
      "id": 1,
      "name": "Diskusi MPASI"
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Chat not found

---

## Socket.IO Events

Socket.IO digunakan untuk real-time messaging. Semua koneksi Socket.IO **WAJIB** menggunakan JWT token untuk authentication.

### Connection

**Client Side:**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token-here'
  }
});

// Alternative: via Authorization header
const socket = io('http://localhost:3000', {
  extraHeaders: {
    Authorization: 'Bearer your-jwt-token-here'
  }
});
```

**Authentication:**
- Token harus valid dan tidak expired
- User harus exist di database
- Koneksi akan ditolak jika token invalid

---

### Client Events (Emit)

#### Join Room

Join ke room tertentu untuk menerima dan mengirim pesan.

**Event:** `join:room`

**Payload:**
```json
{
  "roomId": 1
}
```

**Validation:**
- `roomId`: Required, must be positive integer
- Room must exist and be active

**Rate Limiting:**
- Maximum 5 joins per minute per socket

**Example:**
```javascript
socket.emit('join:room', { roomId: 1 });
```

---

#### Send Message

Mengirim pesan ke room.

**Event:** `chat:message`

**Payload:**
```json
{
  "message": "Halo semua!",
  "roomId": 1
}
```

**Validation:**
- `message`: Required, string, 1-5000 characters
- `roomId`: Required, must be positive integer
- Room must exist and be active
- Message will be sanitized (HTML tags removed)

**Rate Limiting:**
- Maximum 10 messages per minute per socket

**Example:**
```javascript
socket.emit('chat:message', {
  message: 'Halo semua!',
  roomId: 1
});
```

**Note:** User ID diambil dari token, tidak perlu dikirim dari client.

---

#### Typing Start

Mengirim indikator bahwa user sedang mengetik.

**Event:** `typing:start`

**Payload:**
```json
{
  "roomId": 1
}
```

**Rate Limiting:**
- Maximum 30 typing events per minute per socket

**Example:**
```javascript
socket.emit('typing:start', { roomId: 1 });
```

---

#### Typing Stop

Mengirim indikator bahwa user berhenti mengetik.

**Event:** `typing:stop`

**Payload:**
```json
{
  "roomId": 1
}
```

**Example:**
```javascript
socket.emit('typing:stop', { roomId: 1 });
```

---

### Server Events (Listen)

#### Chat History

Menerima history chat saat join room.

**Event:** `chat:history`

**Payload:**
```json
{
  "messages": [
    {
      "id": 1,
      "message": "Halo semua!",
      "UserId": 1,
      "RoomId": 1,
      "createdAt": "2025-01-18T10:00:00.000Z",
      "User": {
        "id": 1,
        "name": "Ibu Siti",
        "photoUrl": null
      },
      "Room": {
        "id": 1,
        "name": "Diskusi MPASI"
      }
    }
  ],
  "roomId": 1
}
```

**Example:**
```javascript
socket.on('chat:history', (data) => {
  console.log('Chat history:', data.messages);
});
```

---

#### New Message

Menerima pesan baru dari user lain di room.

**Event:** `chat:new_message`

**Payload:**
```json
{
  "id": 2,
  "message": "Halo juga!",
  "UserId": 2,
  "RoomId": 1,
  "createdAt": "2025-01-18T10:05:00.000Z",
  "User": {
    "id": 2,
    "name": "Ibu Budi",
    "photoUrl": null
  },
  "Room": {
    "id": 1,
    "name": "Diskusi MPASI"
  }
}
```

**Example:**
```javascript
socket.on('chat:new_message', (chat) => {
  console.log('New message:', chat);
});
```

---

#### User Online

Menerima notifikasi ketika user online.

**Event:** `user:online`

**Payload:**
```json
{
  "userId": 1,
  "isOnline": true,
  "user": {
    "id": 1,
    "name": "Ibu Siti",
    "photoUrl": null,
    "isOnline": true
  }
}
```

**Example:**
```javascript
socket.on('user:online', (data) => {
  console.log('User online:', data.user);
});
```

---

#### User Offline

Menerima notifikasi ketika user offline.

**Event:** `user:offline`

**Payload:**
```json
{
  "userId": 1,
  "isOnline": false
}
```

**Example:**
```javascript
socket.on('user:offline', (data) => {
  console.log('User offline:', data.userId);
});
```

---

#### Users Online

Menerima daftar semua user yang online.

**Event:** `users:online`

**Payload:**
```json
{
  "users": [
    {
      "id": 1,
      "name": "Ibu Siti",
      "photoUrl": null,
      "isOnline": true
    }
  ]
}
```

**Example:**
```javascript
socket.on('users:online', (data) => {
  console.log('Online users:', data.users);
});
```

---

#### Typing Indicator

Menerima indikator typing dari user lain.

**Event:** `typing:indicator`

**Payload:**
```json
{
  "userId": 1,
  "isTyping": true
}
```

**Example:**
```javascript
socket.on('typing:indicator', (data) => {
  if (data.isTyping) {
    console.log(`User ${data.userId} is typing...`);
  } else {
    console.log(`User ${data.userId} stopped typing`);
  }
});
```

---

#### Error

Menerima error dari server.

**Event:** `error`

**Payload:**
```json
{
  "message": "Error message here"
}
```

**Example:**
```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error.message);
});
```

---

## Error Handling

### HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Error Response Format

```json
{
  "message": "Error message here"
}
```

**Validation Error:**
```json
{
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

---

## Rate Limiting

### REST API

**AI Endpoints:**
- `POST /api/rooms/generate-content`: 5 requests per minute per user

### Socket.IO

**Rate Limits:**
- `join:room`: 5 requests per minute per socket
- `chat:message`: 10 messages per minute per socket
- `typing:start`: 30 events per minute per socket

**Rate Limit Exceeded Response:**
```json
{
  "message": "Too many requests. Please wait before trying again."
}
```

---

## Security

### Authentication

- JWT tokens dengan expiration 24 jam
- Password di-hash menggunakan bcrypt
- Token harus dikirim di header untuk REST API
- Token harus dikirim di auth object untuk Socket.IO

### Authorization

- User hanya bisa update profil sendiri
- Admin-only endpoints memerlukan role `admin`
- Socket.IO user ID diambil dari token (tidak bisa di-spoof)

### Input Validation

- Semua input divalidasi dan di-sanitize
- Message di-sanitize untuk mencegah XSS
- SQL injection protection via Sequelize ORM

### Privacy

- Email tidak di-broadcast ke semua client
- User hanya bisa akses data yang diizinkan

---

## Examples

### Complete Flow Example

**1. Register User:**
```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ibu Siti",
    "email": "siti@example.com",
    "password": "password123"
  }'
```

**2. Login:**
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "siti@example.com",
    "password": "password123"
  }'
```

**3. Get Rooms:**
```bash
curl -X GET http://localhost:3000/api/rooms \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**4. Connect Socket.IO:**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'YOUR_TOKEN_HERE'
  }
});

socket.on('connect', () => {
  console.log('Connected!');
  
  // Join room
  socket.emit('join:room', { roomId: 1 });
  
  // Listen for messages
  socket.on('chat:new_message', (chat) => {
    console.log('New message:', chat.message);
  });
  
  // Send message
  socket.emit('chat:message', {
    message: 'Halo semua!',
    roomId: 1
  });
});
```

---

## Support

Untuk pertanyaan atau bantuan, silakan hubungi tim development atau buka issue di repository.

**Repository:** https://github.com/TheresiaSamantha/Chat-Ibu-Server

---

**Last Updated:** January 2025  
**API Version:** 1.0.0


