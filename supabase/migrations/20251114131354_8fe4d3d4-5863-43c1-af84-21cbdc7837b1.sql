-- Add new staff role types to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'spatial_analyst';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'customer_success';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'staff';

-- Add comment to document role purposes
COMMENT ON TYPE app_role IS 'User roles: admin, verification_officer, compliance_officer, spatial_analyst, customer_success, staff, seller, buyer, broker';