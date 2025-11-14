# GeoEstate Tanzania - Staff Roles & Access Guide

## Overview

GeoEstate Tanzania supports multiple staff roles with different permissions and capabilities. This guide explains each role and how to assign them.

---

## Available Staff Roles

### 1. **Admin** (`admin`)
**Full System Access**

**Permissions:**
- View and manage all listings
- Approve/reject verifications
- Manage all users and their roles
- Access all analytics dashboards
- Resolve disputes
- View audit logs
- Manage compliance flags
- Configure system settings

**Use Case:** System administrators, CTO, senior management

---

### 2. **Verification Officer** (`verification_officer`)
**Property Verification Team**

**Permissions:**
- View all listings pending verification
- Approve/reject listing verifications
- Update verification status and notes
- View payment proofs
- Create/update deal closures
- Access verification analytics

**Use Case:** Field agents, surveyors, title deed verifiers

---

### 3. **Compliance Officer** (`compliance_officer`)
**Fraud & Compliance Team**

**Permissions:**
- View all compliance flags
- Review fraud signals
- Investigate suspicious activities
- Resolve disputes
- View audit logs
- Update compliance flag status
- Access fraud detection analytics

**Use Case:** Fraud analysts, compliance managers, legal team

---

### 4. **Spatial Analyst** (`spatial_analyst`) ⭐ NEW
**Data & GIS Team**

**Permissions:**
- View all listings with spatial data
- Access spatial risk profiles
- View land use profiles
- Access valuation estimates
- Run spatial analysis tools
- View analytics dashboards
- Export spatial data

**Use Case:** GIS specialists, data scientists, cartographers, urban planners

---

### 5. **Customer Success** (`customer_success`) ⭐ NEW
**Support & Success Team**

**Permissions:**
- View user profiles and listings
- View messages between users
- Access subscription information
- View visit requests
- View reputation scores
- Access user analytics
- Cannot modify listings or payment data

**Use Case:** Customer support agents, account managers, success team

---

### 6. **Staff** (`staff`) ⭐ NEW
**General Staff Access**

**Permissions:**
- View public listings
- View basic analytics
- Access user profiles (public info)
- Read-only access to most features
- Cannot modify critical data

**Use Case:** Interns, junior staff, operations team

---

### 7. **Seller** (`seller`)
**Property Sellers**

**Permissions:**
- Create and manage own listings
- Upload property documents
- Respond to messages
- View visit requests for own properties
- Manage payment proofs

**Use Case:** Individual land sellers, property owners

---

### 8. **Buyer** (`buyer`)
**Property Buyers**

**Permissions:**
- Browse and search listings
- Send messages to sellers
- Request property visits
- Submit payment proofs
- View own transaction history

**Use Case:** Land buyers, investors

---

### 9. **Broker** (`broker`)
**Real Estate Brokers**

**Permissions:**
- Create and manage own listings
- Subscribe to premium plans
- Access broker analytics
- Enhanced visibility on platform
- Manage multiple listings

**Use Case:** Licensed real estate brokers, agencies

---

## How to Assign Roles

### Method 1: Via Supabase Dashboard (Recommended for Setup)

1. Go to your Supabase project dashboard
2. Navigate to **Table Editor** → `profiles` table
3. Find the user by email or ID
4. Edit the `role` column
5. Select one of the following values:
   - `admin`
   - `verification_officer`
   - `compliance_officer`
   - `spatial_analyst`
   - `customer_success`
   - `staff`
   - `seller`
   - `buyer`
   - `broker`
6. Save changes

### Method 2: Via SQL Query

```sql
-- Assign role to a user by email
UPDATE profiles 
SET role = 'spatial_analyst' 
WHERE email = 'analyst@geoestate.tz';

-- Assign role to a user by ID
UPDATE profiles 
SET role = 'compliance_officer' 
WHERE id = 'user-uuid-here';
```

### Method 3: Via Admin Panel (Future Feature)

A user management interface will be added to allow admins to manage roles directly from the dashboard.

---

## Setting Up Your GeoInsight Team

### Recommended Team Structure:

**Phase 1: Core Team**
- 1-2 **Admins** (founders/CTO)
- 2-3 **Verification Officers** (field team)
- 1 **Compliance Officer** (fraud detection)

**Phase 2: Growth Team**
- 1-2 **Spatial Analysts** (data team)
- 1-2 **Customer Success** (support)
- 1-2 **Staff** (operations)

---

## Quick Setup Commands

### Create Initial Admin
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@geoestate.tz';
```

### Create Verification Team
```sql
UPDATE profiles 
SET role = 'verification_officer' 
WHERE email IN (
  'verifier1@geoestate.tz',
  'verifier2@geoestate.tz',
  'verifier3@geoestate.tz'
);
```

### Create Compliance Team
```sql
UPDATE profiles 
SET role = 'compliance_officer' 
WHERE email IN (
  'compliance1@geoestate.tz',
  'compliance2@geoestate.tz'
);
```

### Create Data/Spatial Team
```sql
UPDATE profiles 
SET role = 'spatial_analyst' 
WHERE email IN (
  'gis@geoestate.tz',
  'data@geoestate.tz'
);
```

### Create Support Team
```sql
UPDATE profiles 
SET role = 'customer_success' 
WHERE email IN (
  'support@geoestate.tz',
  'success@geoestate.tz'
);
```

---

## Role Verification

To check a user's current role:

```sql
SELECT 
  id,
  full_name,
  email,
  role,
  created_at
FROM profiles
WHERE email = 'user@example.com';
```

To list all users by role:

```sql
SELECT 
  role,
  COUNT(*) as user_count
FROM profiles
GROUP BY role
ORDER BY user_count DESC;
```

---

## Security Notes

⚠️ **Important Security Considerations:**

1. **Admin Access**: Limit admin role to trusted senior team members only
2. **Role Changes**: Always audit role changes via the `audit_logs` table
3. **Default Role**: New users default to no role and must be assigned one manually
4. **RLS Policies**: All database tables enforce role-based access via Row Level Security

---

## Need Help?

For role-related issues:
1. Check Supabase logs for RLS policy errors
2. Verify user exists in `profiles` table
3. Confirm role value matches exact enum values
4. Contact GeoEstate support at support@geoestate.tz

---

## Changelog

**2024-11-14**
- ✅ Added `spatial_analyst` role for GIS team
- ✅ Added `customer_success` role for support team
- ✅ Added `staff` role for general staff access
- ✅ Documented all existing roles
