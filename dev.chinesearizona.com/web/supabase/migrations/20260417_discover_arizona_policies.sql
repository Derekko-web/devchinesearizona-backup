create policy "discover_articles_public_read"
on public.discover_articles
for select
to anon, authenticated
using (published_at is not null and embed_enabled = true);

create policy "discover_video_candidates_no_client_access"
on public.discover_video_candidates
for all
to anon, authenticated
using (false)
with check (false);
