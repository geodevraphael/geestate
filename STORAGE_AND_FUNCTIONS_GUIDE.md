# GeoEstate Storage Buckets & Edge Functions Guide

## Storage Buckets Overview

### 1. `listing-media` (Public)

**Purpose:** Stores all media files related to property listings and institutions.

**What it stores:**
- Property/listing images (photos of land, buildings, plots)
- Project cover images
- Institutional seller logos
- Institutional seller cover images

**File naming convention:**
```
{listing_id}/{random_number}.{extension}     # Property images
{user_id}/{timestamp}.{extension}            # Project images
institutions/{institution_id}/logo-{timestamp}   # Institution logos
institutions/{institution_id}/cover-{timestamp}  # Institution covers
```

**Used by:**
- `src/pages/CreateListing.tsx` - Uploading property photos
- `src/pages/Projects.tsx` - Uploading project images
- `src/components/InstitutionalSellerEnhancedForm.tsx` - Institution branding

**Access:** Public read, authenticated upload

---

### 2. `survey-plans` (Public)

**Purpose:** Stores survey plan documents and technical drawings submitted for property verification.

**What it stores:**
- Survey plan PDFs
- Land survey documents
- Plot boundary documents
- Technical drawings from surveyors

**File naming convention:**
```
{user_id}/{timestamp}.{extension}            # User uploads
{service_request_id}/{timestamp}.{extension} # Service provider uploads
```

**Used by:**
- `src/components/SurveyPlanUploadDialog.tsx` - Users requesting listings to be created from survey plans
- `src/components/service-provider/ServiceRequests.tsx` - Service providers uploading completed survey work

**Access:** Public read, authenticated upload

**Flow:**
1. User uploads survey plan via SurveyPlanUploadDialog
2. Creates entry in `listing_requests` table
3. Admin reviews and creates listing from survey plan
4. Service providers can also upload deliverables here

---

### 3. `payment-proofs` (Private)

**Purpose:** Stores proof of payment documents for property transactions between buyers and sellers.

**What it stores:**
- Bank transfer receipts
- Mobile money transaction screenshots
- Payment confirmation documents
- Service request payment proofs

**File naming convention:**
```
{user_id}/{timestamp}.{extension}            # Buyer payment proofs
reports/{filename}                           # Service request reports
geoinsight-proofs/{record_id}_{timestamp}.{extension}  # Legacy path
```

**Used by:**
- `src/components/PaymentProofDialog.tsx` - Buyers uploading payment proof for property purchases
- `src/components/SubscriptionPaymentDialog.tsx` - Subscription payments
- `src/pages/ServiceRequestDetail.tsx` - Service payment reports
- `src/pages/PaymentProofs.tsx` - Viewing/managing payment proofs

**Access:** Private - Only accessible by:
- Transaction parties (buyer/seller)
- Admins
- Compliance officers

**Flow:**
1. Buyer uploads payment proof
2. Seller reviews and confirms/rejects
3. If confirmed → Goes to admin for final review
4. Admin approves → Deal closure initiated

---

### 4. `geoinsight-proofs` (Public)

**Purpose:** Stores payment proofs for GeoInsight platform fees (listing fees, commissions, subscriptions).

**What it stores:**
- Platform fee payment receipts
- Listing fee payment proofs
- Commission payment proofs
- Monthly subscription payment proofs

**File naming convention:**
```
{user_id}/{income_record_id}_{timestamp}.{extension}
```

**Used by:**
- `src/pages/UploadPaymentProof.tsx` - Uploading proof for platform income records

**Access:** Public read (for admin review ease), authenticated upload

**Flow:**
1. System generates income record (listing fee, commission, etc.)
2. User uploads payment proof
3. Admin reviews and approves/rejects
4. If approved → Income record marked as paid

---

## Database Tables Related to Storage

### `listing_media`
Links media files to listings:
```sql
- id: UUID
- listing_id: UUID (FK to listings)
- file_url: TEXT (storage URL)
- media_type: ENUM (image, video, document, floor_plan)
- caption: TEXT
```

### `listing_requests`
Survey plan upload requests:
```sql
- id: UUID
- user_id: UUID
- survey_plan_url: TEXT (storage URL)
- location_description: TEXT
- status: TEXT (pending, approved, rejected)
```

### `payment_proofs`
Property transaction payment proofs:
```sql
- id: UUID
- listing_id: UUID
- buyer_id: UUID
- seller_id: UUID
- proof_file_url: TEXT (storage URL)
- amount_paid: NUMERIC
- status: ENUM (pending, seller_confirmed, admin_approved, rejected)
```

### `geoinsight_payment_proofs`
Platform fee payment proofs:
```sql
- id: UUID
- income_record_id: UUID
- payer_id: UUID
- proof_file_url: TEXT (storage URL)
- amount_paid: NUMERIC
- status: TEXT (pending, accepted, rejected)
```

---

## Edge Functions

### Core Functions

| Function | Purpose | Trigger |
|----------|---------|---------|
| `health-check` | System health monitoring | Manual/Cron |
| `generate-sample-data` | Creates test data for development | Manual |
| `setup-staff-accounts` | Creates staff user accounts | Manual |

### Spatial Analysis Functions

| Function | Purpose | Trigger |
|----------|---------|---------|
| `calculate-land-use` | Determines land use classification | On listing creation |
| `calculate-proximity-analysis` | Analyzes nearby amenities/features | On demand |
| `calculate-spatial-risk` | Calculates flood/environmental risks | On listing creation |
| `calculate-valuation` | Estimates property value | On listing creation |
| `check-polygon-overlap` | Detects overlapping property boundaries | On polygon save |
| `detect-admin-boundaries` | Identifies region/district/ward | On polygon save |

### Fraud Detection Functions

| Function | Purpose | Trigger |
|----------|---------|---------|
| `detect-polygon-fraud` | Checks for suspicious polygon patterns | On listing creation |
| `detect-price-anomaly` | Flags unusual pricing | On listing creation |
| `detect-multi-account` | Identifies potential fake accounts | On user activity |
| `detect-user-location` | Validates user location | On auth |

### Automation Functions

| Function | Purpose | Trigger |
|----------|---------|---------|
| `check-listing-expiry` | Marks expired listings | Cron (daily) |
| `generate-monthly-fees` | Creates monthly subscription charges | Cron (monthly) |
| `backfill-listing-fees` | Recalculates all listing fees | Manual |
| `update-listings-with-valuation` | Batch updates valuations | Manual |

### Communication Functions

| Function | Purpose | Trigger |
|----------|---------|---------|
| `send-email-notification` | Sends email notifications | On events |
| `deliver-webhook` | Sends webhooks to external systems | On events |

### AI Functions

| Function | Purpose | Trigger |
|----------|---------|---------|
| `ai-generate-description` | Auto-generates listing descriptions | On demand |
| `ai-suggest-reply` | Suggests message replies | On demand |

### Admin Functions

| Function | Purpose | Trigger |
|----------|---------|---------|
| `admin-reset-password` | Resets user passwords | Manual (admin) |

---

## RLS Policies Summary

### `listing-media` Bucket
```sql
-- Anyone can view (public bucket)
SELECT: bucket_id = 'listing-media'

-- Authenticated users can upload
INSERT: bucket_id = 'listing-media' (authenticated only)
```

### `survey-plans` Bucket
```sql
-- Anyone can view (public bucket)
SELECT: bucket_id = 'survey-plans'

-- Authenticated users can upload
INSERT: bucket_id = 'survey-plans' AND auth.role() = 'authenticated'
```

### `payment-proofs` Bucket
```sql
-- Transaction parties and admins can view
SELECT: (
  bucket_id = 'payment-proofs' AND (
    is_admin OR
    is_compliance_officer OR
    owner_id = auth.uid() OR
    is_transaction_party
  )
)
```

### `geoinsight-proofs` Bucket
```sql
-- Public can view
SELECT: bucket_id = 'geoinsight-proofs'

-- Admins have additional access
SELECT: bucket_id = 'geoinsight-proofs' AND is_admin
```

---

## Cleanup SQL (Fresh Start)

To clear all storage objects when starting fresh:
```sql
DELETE FROM storage.objects;
```

To transfer ownership to a new admin:
```sql
UPDATE storage.objects 
SET owner = (SELECT id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1);
```

---

## File Size Limits

| Bucket | Max File Size | Allowed Types |
|--------|---------------|---------------|
| listing-media | 10MB | jpg, jpeg, png, webp, gif |
| survey-plans | 20MB | pdf, jpg, jpeg, png |
| payment-proofs | 10MB | jpg, jpeg, png, pdf |
| geoinsight-proofs | 10MB | jpg, jpeg, png, pdf |

---

## Common Issues & Solutions

### Images not loading after migration
**Cause:** Storage objects have orphaned `owner` references
**Fix:** `DELETE FROM storage.objects;` or `UPDATE storage.objects SET owner = NULL;`

### Upload fails with permission error
**Cause:** User not authenticated or bucket RLS policy not met
**Fix:** Ensure user is logged in and has appropriate role

### Signed URL expired
**Cause:** Private bucket URLs expire (default 1 hour)
**Fix:** Generate new signed URL or extend expiry time
