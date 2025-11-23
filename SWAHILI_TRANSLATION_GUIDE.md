# Swahili Translation Implementation Guide

## Overview
This guide ensures all text in GeoEstate Tanzania is properly translated when Swahili language is selected.

## Key Translations

### User Roles
- **seller** → "Muuzaji Binafsi" (Individual Seller)
- **buyer** → "Mnunuzi" (Buyer)
- **broker** → "Dalali" (Broker)
- **institutional_seller** → "Taasisi/Kampuni" (Institution/Company)
- **admin** → "Msimamizi" (Administrator)
- **verification_officer** → "Afisa Uthibitishaji" (Verification Officer)
- **compliance_officer** → "Afisa Usimamizi" (Compliance Officer)
- **customer_success** → "Afisa Huduma kwa Wateja" (Customer Success Officer)
- **spatial_analyst** → "Mchanganuzi wa Nafasi" (Spatial Analyst)

### Property Types
- **land** → "Ardhi"
- **residential** → "Nyumba ya Makazi"
- **commercial** → "Biashara"
- **agricultural** → "Kilimo"
- **industrial** → "Viwanda"
- **mixed_use** → "Matumizi Mchanganyiko"

### Listing Types
- **sale** → "Kuuza"
- **rent** → "Kukodisha"
- **lease** → "Kukodisha Muda Mrefu"

### Status Types
- **verified** → "Imethibitishwa"
- **pending** → "Inasubiri"
- **rejected** → "Imekataliwa"
- **unverified** → "Haijathibitishwa"
- **published** → "Imechapishwa"
- **draft** → "Rasimu"
- **sold** → "Imeuzwa"

## Implementation Rules

### 1. Always Use i18n Hook
```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('listing.title')}</h1>
      <p>{t('listing.description')}</p>
    </div>
  );
}
```

### 2. Never Hardcode English Text
❌ WRONG:
```tsx
<Button>Contact Seller</Button>
```

✅ CORRECT:
```tsx
<Button>{t('listing.contact')}</Button>
```

### 3. Dynamic Content Translation
For dynamic values like roles or property types, use translation keys:

```tsx
// For roles
<Badge>{t(`roles.${userRole}`)}</Badge>

// For property types
<span>{t(`propertyTypes.${propertyType}`)}</span>

// For statuses
<Badge>{t(`verificationStatus.${status}`)}</Badge>
```

### 4. Enum Translation Pattern
When displaying database enums, always translate:

```tsx
// Bad
<div>{listing.property_type}</div>

// Good
<div>{t(`propertyTypes.${listing.property_type}`)}</div>
```

### 5. Form Labels and Placeholders
```tsx
<Label>{t('auth.email')}</Label>
<Input 
  type="email"
  placeholder={t('auth.email')}
/>
```

### 6. Button Text
```tsx
<Button>{t('common.save')}</Button>
<Button>{t('common.cancel')}</Button>
<Button>{t('common.edit')}</Button>
```

### 7. Navigation Links
```tsx
<Link to="/sellers">{t('nav.sellers')}</Link>
<Link to="/dashboard">{t('nav.dashboard')}</Link>
```

## Translation Keys Structure

All translations are organized in `/src/i18n/locales/`:
- `en.json` - English translations
- `sw.json` - Swahili translations

### Main Categories:
- `app.*` - Application name and slogan
- `nav.*` - Navigation items
- `roles.*` - User roles
- `propertyTypes.*` - Property types
- `listingTypes.*` - Listing types
- `verificationStatus.*` - Verification statuses
- `listingStatus.*` - Listing statuses
- `auth.*` - Authentication related
- `listing.*` - Listing details
- `dashboard.*` - Dashboard content
- `messages.*` - Messaging system
- `visits.*` - Visit requests
- `payments.*` - Payment related
- `institutions.*` - Institution related
- `profile.*` - User profile
- `crm.*` - CRM system
- `ai.*` - AI features
- `webhooks.*` - Webhook integrations
- `services.*` - Geospatial services
- `verification.*` - Verification system
- `admin.*` - Admin panel
- `common.*` - Common UI elements

## Testing Translations

1. Switch language using the language switcher in the navbar
2. Navigate through all pages
3. Check all buttons, labels, and text content
4. Verify dropdowns show translated options
5. Ensure no English text remains visible

## Common Pitfalls

1. **Forgetting to translate dropdown options**
   - Select options must use t() function
   
2. **Hardcoded status badges**
   - Always use translation keys for status displays

3. **Toast notifications**
   - Use t() for toast messages
   ```tsx
   toast.success(t('common.success'));
   ```

4. **Table headers and data**
   - Translate column headers and cell content

5. **Error messages**
   - Translate all error messages

## Adding New Translations

When adding new features:
1. Add English key to `en.json`
2. Add corresponding Swahili translation to `sw.json`
3. Use `t('your.key')` in component
4. Test in both languages

## Language Persistence

The selected language is stored in `localStorage` with key `preferred_locale` and persists across sessions.
