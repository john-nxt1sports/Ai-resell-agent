# Delete Account Feature

## Overview

This feature allows users to permanently delete their account and all associated data from the AI Resell Agent platform. The implementation follows best practices for data deletion and user privacy.

## Features

### User Interface

- **Professional Design**: Clean, warning-focused UI with clear visual hierarchy
- **Confirmation Modal**: Two-step confirmation process to prevent accidental deletions
- **Type-to-Confirm**: Users must type "DELETE" to proceed
- **Clear Warning Messages**: Lists all data that will be deleted
- **Loading States**: Proper feedback during the deletion process

### Data Deletion

The account deletion process removes:

1. **User Profile**: Full name, email, avatar, subscription info
2. **Listings**: All listings (draft, published, sold, archived)
3. **Marketplace Connections**: eBay, Poshmark, Mercari connections
4. **Marketplace Listings**: Cross-posted listing data
5. **Analytics**: All analytics and performance data
6. **AI Generations**: AI generation history and token usage
7. **Support Tickets**: Support history and messages

### Database Cascade

All related data is automatically deleted through PostgreSQL cascade constraints:

```sql
REFERENCES public.profiles(id) ON DELETE CASCADE
```

## Implementation

### Files Modified/Created

1. **`lib/auth.ts`**

   - Added `deleteAccount()` function
   - Handles profile deletion and auth sign-out
   - Calls Supabase RPC for complete cleanup

2. **`components/ui/DeleteAccountModal.tsx`** (NEW)

   - Confirmation modal with type-to-confirm
   - Error handling and loading states
   - Professional warning UI

3. **`components/pages/Settings.tsx`**

   - Added "Danger Zone" section
   - Integrated delete account modal
   - Handles post-deletion redirect

4. **`supabase/migrations/delete_user_function.sql`** (NEW)
   - SQL function for user deletion
   - Optional anonymization function
   - Security definer for proper permissions

## Setup Instructions

### 1. Run the SQL Migration

Execute the migration in your Supabase SQL Editor:

```bash
# Copy the contents of supabase/migrations/delete_user_function.sql
# and run it in your Supabase project's SQL Editor
```

### 2. Verify Cascade Constraints

Ensure all tables have proper cascade constraints (already set up in `setup.sql`):

```sql
-- Check existing constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'profiles';
```

### 3. Test the Feature

1. Create a test user account
2. Add some test data (listings, etc.)
3. Go to Settings → Danger Zone
4. Click "Delete Account"
5. Follow the confirmation process
6. Verify all data is deleted from the database

## Security Considerations

### Authentication Required

- Only authenticated users can delete their account
- Users can only delete their own account (enforced by `auth.uid()`)

### Two-Step Confirmation

1. Click "Delete Account" button
2. Type "DELETE" in confirmation modal
3. Click "Delete Account" in modal

### Data Privacy Compliance

- **GDPR Compliant**: Allows users to exercise their "right to be forgotten"
- **CCPA Compliant**: Provides data deletion mechanism
- **Immediate Deletion**: Data is deleted immediately upon confirmation

### Cascade Deletion

All foreign key constraints use `ON DELETE CASCADE`:

- Ensures no orphaned records
- Automatically cleans up related data
- Maintains referential integrity

## User Flow

```
Settings Page
    ↓
Click "Delete Account" (Danger Zone)
    ↓
Delete Account Modal Opens
    ↓
Read Warning Message
    ↓
Type "DELETE" to Confirm
    ↓
Click "Delete Account" in Modal
    ↓
Account Deletion Process
    ↓
Redirect to Home Page
```

## Technical Details

### deleteAccount Function

```typescript
export async function deleteAccount(): Promise<{ error: Error | null }> {
  const supabase = createClient();

  // 1. Get current user
  // 2. Delete profile (cascades to all related tables)
  // 3. Call RPC function for auth cleanup
  // 4. Sign out user
  // 5. Return result
}
```

### Modal State Management

- `showDeleteAccountModal`: Controls modal visibility
- `confirmText`: Stores user's confirmation input
- `isDeleting`: Prevents duplicate submissions
- `error`: Displays any error messages

### Post-Deletion Redirect

After successful deletion:

```typescript
router.push("/"); // Redirects to home page
```

## Alternative: Anonymization

If you need to keep records for compliance/legal reasons, use the anonymization function instead:

```typescript
// In lib/auth.ts
export async function anonymizeAccount(): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const { error } = await supabase.rpc("anonymize_user");

  if (!error) {
    await supabase.auth.signOut();
  }

  return { error };
}
```

This will:

- Replace email with `deleted_user_[id]@deleted.local`
- Set name to "Deleted User"
- Remove avatar
- Archive all listings
- Keep records for audit purposes

## Testing Checklist

- [ ] User can open delete account modal
- [ ] Modal shows all warning messages
- [ ] "DELETE" confirmation is required
- [ ] Deletion button is disabled until "DELETE" is typed
- [ ] Loading state shows during deletion
- [ ] Error messages display if deletion fails
- [ ] User is redirected after successful deletion
- [ ] All database records are deleted
- [ ] No orphaned records remain
- [ ] User cannot log back in with deleted credentials

## Support

If users need to recover their account after deletion:

- **Not Possible**: Deletion is permanent and irreversible
- **Best Practice**: Warn users multiple times before deletion
- **Alternative**: Implement a "deactivation" feature for temporary account suspension

## Future Enhancements

1. **Grace Period**: Allow 30-day grace period before permanent deletion
2. **Data Export**: Offer data export before deletion (GDPR requirement)
3. **Email Confirmation**: Send confirmation email before deletion
4. **Reason Collection**: Ask users why they're deleting their account
5. **Subscription Cancellation**: Automatically cancel any active subscriptions
