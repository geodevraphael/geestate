-- Add INSERT policy for user_roles table to allow onboarding

-- Drop existing insert policies if any to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their first role during onboarding" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Allow users to insert their FIRST role (for onboarding)
-- They can only insert if they don't have any roles yet
CREATE POLICY "Users can insert their first role during onboarding"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid()
  )
);

-- Allow admins to insert roles for any user
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Allow admins to delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));