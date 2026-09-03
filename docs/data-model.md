# Campus Connect V2 — Data Model

Mirrors the ERD in proposal section 4.3. Four primary entities: **Users, Listings,
Messages, Transactions**. Prisma schema: `server/prisma/schema.prisma`.

## Users

| Key | Field | Type | Notes |
| --- | --- | --- | --- |
| PK | `user_id` | Int | Auto-increment |
| | `full_name` | String | Display name |
| | `phone_number` | String, unique | Login + M-Pesa STK Push target (E.164, e.g. `+2547XXXXXXXX`) |
| | `password_hash` | String | bcrypt |
| | `phone_verified` | Boolean | Set true after OTP check; gate for hiring/payouts |
| | `public_key` | String? | Client-generated public key for E2EE chat; set during onboarding |
| | `created_at` | DateTime | |
| | `updated_at` | DateTime | |

Operational companion table (not in the proposal ERD, needed for verification):

**OtpCode** — `id`, `user_id` (FK), `code_hash`, `purpose` (`PHONE_VERIFY` \| `LOGIN`),
`expires_at`, `consumed_at?`, `attempts`, `created_at`.

## Listings

| Key | Field | Type | Notes |
| --- | --- | --- | --- |
| PK | `listing_id` | Int | Auto-increment |
| FK | `user_id` | Int | Owning service provider → Users |
| | `category_type` | Enum | `DIGITAL` \| `PHYSICAL` |
| | `category` | String | Free sub-category, e.g. "Photography", "Tutoring", "Camera hire" |
| | `title` | String | |
| | `description` | String | |
| | `price` | Decimal | KES, for the gig or rental |
| | `location` | String? | Town / area — relevant for physical hire |
| | `status` | Enum | `ACTIVE` \| `PAUSED` \| `HIRED` |
| | `created_at` / `updated_at` | DateTime | |

## Messages  *(Module 3 — schema only for now)*

| Key | Field | Type | Notes |
| --- | --- | --- | --- |
| PK | `message_id` | Int | Auto-increment |
| FK | `sender_id` | Int | → Users |
| FK | `receiver_id` | Int | → Users |
| | `encrypted_payload` | String | Ciphertext; the server cannot read it |
| | `delivered_at` | DateTime? | |
| | `created_at` | DateTime | |

## Transactions  *(Module 2 — schema only for now)*

| Key | Field | Type | Notes |
| --- | --- | --- | --- |
| PK | `transaction_id` | Int | Auto-increment |
| FK | `listing_id` | Int | → Listings |
| FK | `client_id` | Int | Paying client → Users |
| FK | `provider_id` | Int | Payee → Users |
| | `amount` | Decimal | Total held / released (fee + deposit) |
| | `escrow_status` | Enum | `HELD` \| `RELEASED` \| `REFUNDED` |
| | `mpesa_checkout_id` | String? | STK Push `CheckoutRequestID` |
| | `mpesa_receipt` | String? | Daraja confirmation receipt |
| | `created_at` / `updated_at` | DateTime | |

## Relationships

| Entity | Related | Relationship | Foreign key |
| --- | --- | --- | --- |
| User | Listing | 1 → N | `listings.user_id → users.user_id` |
| User (client) | Transaction | 1 → N | `transactions.client_id → users.user_id` |
| User (provider) | Transaction | 1 → N | `transactions.provider_id → users.user_id` |
| Listing | Transaction | 1 → N | `transactions.listing_id → listings.listing_id` |
| User (sender) | Message | 1 → N | `messages.sender_id → users.user_id` |
| User (receiver) | Message | 1 → N | `messages.receiver_id → users.user_id` |
