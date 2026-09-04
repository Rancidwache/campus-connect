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
| | `bio` | String? | Short profile blurb |
| | `avatar_url` / `avatar_key` | String? | Profile photo URL + its storage key |
| | `socials` | JSON? | `{ tiktok, instagram, whatsapp, x, facebook, youtube, linkedin, website }` — normalised to URLs |
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

### ListingMedia

Up to 5 images + one video per listing. Files live in object storage
(`server/uploads` in dev, Supabase Storage in production).

`id`, `listing_id` (FK, cascade), `kind` (`IMAGE` \| `VIDEO`), `url`,
`storage_key`, `position`, `created_at`.

## Messages  *(Module 3 — E2EE chat)*

| Key | Field | Type | Notes |
| --- | --- | --- | --- |
| PK | `message_id` | Int | Auto-increment |
| FK | `sender_id` | Int | → Users |
| FK | `receiver_id` | Int | → Users |
| | `encrypted_payload` | String | `v1.<ivB64>.<ciphertextB64>` — AES-GCM, opaque to the server |
| | `delivered_at` | DateTime? | Set when the recipient first loads the thread |
| | `created_at` | DateTime | |

Encryption keys live on `User.public_key` (client-generated ECDH P-256; the private
key never reaches the server). No schema change was needed for Module 3.

## Transactions  *(Module 2 — HustleGuard escrow)*

| Key | Field | Type | Notes |
| --- | --- | --- | --- |
| PK | `transaction_id` | Int | Auto-increment |
| FK | `listing_id` | Int | → Listings |
| FK | `client_id` | Int | Paying client → Users |
| FK | `provider_id` | Int | Payee → Users |
| | `currency` | String | `KES` |
| | `fee_amount` | Decimal | The provider's payout (listing price at hire time) |
| | `platform_fee` | Decimal | Campus Connect commission (`PLATFORM_FEE_RATE`) |
| | `amount` | Decimal | Total charged to the client = fee + platform_fee |
| | `escrow_status` | Enum | `PENDING_PAYMENT` → `HELD` → `RELEASING` → `RELEASED`; also `PAYMENT_FAILED`, `REFUNDING` → `REFUNDED`, `CANCELLED`. The proposal ERD names the three resting states (Held / Released / Refunded). |
| | `client_phone` / `provider_phone` | String | E.164 snapshots — STK Push and B2C targets |
| | `stk_checkout_request_id` | String? unique | Daraja STK `CheckoutRequestID` |
| | `stk_merchant_request_id` | String? | Daraja STK `MerchantRequestID` |
| | `stk_result_code` / `stk_result_desc` | Int? / String? | STK callback outcome |
| | `mpesa_receipt` | String? | Deposit confirmation receipt |
| | `b2c_conversation_id` | String? unique | Daraja B2C `ConversationID` |
| | `b2c_result_code` / `b2c_result_desc` | Int? / String? | B2C result outcome |
| | `b2c_receipt` | String? | Payout / refund receipt |
| | `paid_at` / `released_at` / `refunded_at` | DateTime? | Lifecycle timestamps |
| | `created_at` / `updated_at` | DateTime | |

### MpesaEvent  *(audit log — not in the proposal ERD)*

Every Daraja request and callback, stored raw for idempotency and debugging:
`id`, `transaction_id?` (FK), `kind` (`STK_PUSH_REQUEST` \| `STK_CALLBACK` \|
`B2C_REQUEST` \| `B2C_RESULT` \| `B2C_TIMEOUT`), `ref` (checkout / conversation id),
`result_code?`, `payload` (JSON), `created_at`.

### Notification  *(Module 2 / 4)*

`id`, `user_id` (FK), `type` (`ESCROW_FUNDED` \| `PAYMENT_FAILED` \|
`DELIVERY_APPROVED` \| `ESCROW_RELEASED` \| `ESCROW_REFUNDED` \| `JOB_DECLINED`),
`title`, `body`, `transaction_id?` (FK), `read_at?`, `created_at`. Module 4 adds
real-time push over WebSocket on top of this table.

## Relationships

| Entity | Related | Relationship | Foreign key |
| --- | --- | --- | --- |
| User | Listing | 1 → N | `listings.user_id → users.user_id` |
| User (client) | Transaction | 1 → N | `transactions.client_id → users.user_id` |
| User (provider) | Transaction | 1 → N | `transactions.provider_id → users.user_id` |
| Listing | Transaction | 1 → N | `transactions.listing_id → listings.listing_id` |
| User (sender) | Message | 1 → N | `messages.sender_id → users.user_id` |
| User (receiver) | Message | 1 → N | `messages.receiver_id → users.user_id` |
