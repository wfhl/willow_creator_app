-- Set up current config & storage with Row Level Security

-- Create Profiles table
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  username text,
  avatar_url text,
  updated_at timestamp with time zone,
  
  constraint username_length check (char_length(username) >= 3)
);
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- Create Folders table
create table public.folders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  parent_id uuid references public.folders,
  created_at timestamp with time zone default now()
);
alter table public.folders enable row level security;
create policy "Users can view own folders." on folders for select using (auth.uid() = user_id);
create policy "Users can insert own folders." on folders for insert with check (auth.uid() = user_id);
create policy "Users can update own folders." on folders for update using (auth.uid() = user_id);
create policy "Users can delete own folders." on folders for delete using (auth.uid() = user_id);

-- Create Assets table
create table public.assets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  folder_id uuid references public.folders,
  name text not null,
  type text not null, -- 'image', 'video'
  storage_path text not null, -- Path in Supabase Storage
  public_url text, -- For faster access if public
  width integer,
  height integer,
  created_at timestamp with time zone default now()
);
alter table public.assets enable row level security;
create policy "Users can view own assets." on assets for select using (auth.uid() = user_id);
create policy "Users can insert own assets." on assets for insert with check (auth.uid() = user_id);
create policy "Users can update own assets." on assets for update using (auth.uid() = user_id);
create policy "Users can delete own assets." on assets for delete using (auth.uid() = user_id);

-- Create Themes table
create table public.themes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  base_prompt text,
  default_outfit text,
  default_setting text,
  default_visuals text,
  created_at timestamp with time zone default now()
);
alter table public.themes enable row level security;
create policy "Users can view own themes." on themes for select using (auth.uid() = user_id);
create policy "Users can manage own themes." on themes for all using (auth.uid() = user_id);

-- Create Caption Styles table
create table public.caption_styles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  label text not null,
  prompt text not null,
  created_at timestamp with time zone default now()
);
alter table public.caption_styles enable row level security;
create policy "Users can view own styles." on caption_styles for select using (auth.uid() = user_id);
create policy "Users can manage own styles." on caption_styles for all using (auth.uid() = user_id);

-- Create Generation History table
create table public.generation_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  timestamp timestamp with time zone default now(),
  type text not null, 
  prompt text not null,
  model text,
  media_urls text[],
  aspect_ratio text,
  image_size text,
  num_images integer,
  video_resolution text,
  video_duration text,
  service text,
  status text,
  error_message text,
  theme_id text,
  theme_name text,
  topic text,
  visuals text,
  outfit text
);
alter table public.generation_history enable row level security;
create policy "Users can view own history." on generation_history for select using (auth.uid() = user_id);
create policy "Users can manage own history." on generation_history for all using (auth.uid() = user_id);

-- Create Posts table
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  timestamp timestamp with time zone default now(),
  topic text,
  caption text,
  caption_type text,
  media_urls text[],
  media_type text,
  theme_id text,
  visuals text,
  outfit text,
  prompt text,
  tags text[]
);
alter table public.posts enable row level security;
create policy "Users can manage own posts" on posts for all using (auth.uid() = user_id);

-- Create Presets table
create table public.presets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  description text,
  base_prompt text,
  theme_id text,
  visuals text,
  outfit text,
  action text,
  model text,
  aspect_ratio text,
  negative_prompt text,
  video_duration text,
  video_resolution text,
  timestamp timestamp with time zone default now()
);
alter table public.presets enable row level security;
create policy "Users can manage own presets" on presets for all using (auth.uid() = user_id);

-- Update Assets table to track which bucket an asset belongs to
alter table public.assets add column bucket_id text default 'user-library';

-- Storage Buckets Configuration
insert into storage.buckets (id, name, public) values ('user-library', 'user-library', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('face-references', 'face-references', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('generated-media', 'generated-media', true) on conflict (id) do nothing;

-- Security Policies for Storage
-- Note: Simplified "own data" access. Supabase Storage uses auth.uid() = (storage.foldername(name))[1] if folders are named by user_id

create policy "Users can manage own library" on storage.objects for all 
using ( bucket_id = 'user-library' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Users can manage own face references" on storage.objects for all 
using ( bucket_id = 'face-references' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Users can manage own generated media" on storage.objects for all 
using ( bucket_id = 'generated-media' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Public view for library" on storage.objects for select using ( bucket_id = 'user-library' );
create policy "Public view for generated" on storage.objects for select using ( bucket_id = 'generated-media' );

