-- Seed data for development (run after migrations)
-- Note: auth.users rows must be created via Supabase Auth — these reference existing users.

-- Sample public routes (replace UUIDs with real user IDs after seeding auth users)
-- This file is illustrative; actual seeding happens via supabase CLI or dashboard.

/*
insert into public.routes (id, user_id, title, description, sport_type, distance_m, elevation_gain_m, difficulty, is_public, waypoints)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '<your-user-id>',
    'Lake District Summit Loop',
    'A stunning circular route taking in the best views of the Lake District. Suitable for experienced hikers.',
    'hiking',
    15200,
    890,
    'hard',
    true,
    '[{"lat":54.4786,"lng":-3.0079,"title":"Start: Keswick"},{"lat":54.4826,"lng":-3.0223,"title":"Skiddaw Summit"},{"lat":54.4786,"lng":-3.0079,"title":"End: Keswick"}]'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '<your-user-id>',
    'Peak District Cycling Circuit',
    'Scenic cycling route through the Peak District with rolling hills and quiet country lanes.',
    'cycling',
    42000,
    520,
    'moderate',
    true,
    '[{"lat":53.3498,"lng":-1.7700,"title":"Start: Bakewell"},{"lat":53.3247,"lng":-1.7835,"title":"Youlgreave"},{"lat":53.3498,"lng":-1.7700,"title":"End: Bakewell"}]'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '<your-user-id>',
    'Richmond Park Easy Walk',
    'A relaxing flat walk through Richmond Park. Perfect for families and beginners.',
    'walking',
    5500,
    45,
    'easy',
    true,
    '[{"lat":51.4412,"lng":-0.2762,"title":"Robin Hood Gate"},{"lat":51.4490,"lng":-0.2720,"title":"Pen Ponds"},{"lat":51.4412,"lng":-0.2762,"title":"Robin Hood Gate"}]'
  );
*/
