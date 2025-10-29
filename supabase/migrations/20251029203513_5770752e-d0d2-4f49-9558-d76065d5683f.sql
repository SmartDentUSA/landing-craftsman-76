-- Create RPC to update landing pages with server-side permission check and safe JSONB merge
create or replace function public.admin_update_landing_page(
  _id text,
  _user_id uuid,
  _name text default null,
  _status text default null,
  _template text default null,
  _data jsonb default null,
  _selected_product_ids text[] default null,
  _embed text default null,
  _blog_generated boolean default null,
  _blog_generated_at timestamptz default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  owner uuid;
begin
  -- Check if caller is admin
  select public.has_role(_user_id, 'admin'::app_role) into is_admin;
  -- Fetch owner of the landing page
  select user_id into owner from public.landing_pages where id = _id;

  -- Allow if admin or owner; otherwise deny
  if not is_admin and owner is distinct from _user_id then
    return false;
  end if;

  -- Perform update with server-side coalesce/merge
  update public.landing_pages
  set
    name = coalesce(_name, name),
    status = coalesce(_status, status),
    template = coalesce(_template, template),
    data = case when _data is null then data else coalesce(data, '{}'::jsonb) || _data end,
    selected_product_ids = coalesce(_selected_product_ids, selected_product_ids),
    embed = coalesce(_embed, embed),
    blog_generated = coalesce(_blog_generated, blog_generated),
    blog_generated_at = coalesce(_blog_generated_at, blog_generated_at),
    last_modified = now(),
    updated_at = now()
  where id = _id;

  return found;
end;
$$;

-- Grant execution to authenticated users
grant execute on function public.admin_update_landing_page(text, uuid, text, text, text, jsonb, text[], text, boolean, timestamptz) to authenticated;