-- Grant admin role to raphaelmussa@outlook.com
INSERT INTO public.user_roles (user_id, role, assigned_by)
VALUES (
  '559186ba-4af2-4307-88d9-22143f3de39c',
  'admin'::app_role,
  '559186ba-4af2-4307-88d9-22143f3de39c'
);