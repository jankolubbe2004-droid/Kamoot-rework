-- ============================================================
-- ROAMFREE SEED DATA — local development only
-- Run via: supabase db reset
-- ============================================================

-- ─── Seed user ───────────────────────────────────────────────────────────────
-- Creates one demo user in auth.users; the handle_new_user trigger
-- automatically inserts the matching profiles row.

do $$
begin
  if not exists (
    select 1 from auth.users where id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  ) then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      'authenticated',
      'authenticated',
      'demo@roamfree.app',
      crypt('demo1234', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"roamfree_demo"}'::jsonb,
      now(),
      now()
    );
  end if;
end $$;

-- Give the trigger a moment to run, then update the plan
update public.profiles
set plan = 'explorer'
where id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- ─── 10 public hiking routes ─────────────────────────────────────────────────

insert into public.routes (
  id, user_id, title, description,
  sport_type, distance_m, elevation_gain_m, difficulty,
  is_public, waypoints, created_at
)
values

-- 1 ─ Scafell Pike via Wasdale Head (Lake District, England)
(
  'b1000000-0000-0000-0000-000000000001',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Scafell Pike via Wasdale Head',
  'The classic ascent of England''s highest peak from the remote Wasdale valley. '
  'The path is well-worn but relentlessly steep above Brown Tongue. '
  'Stunning views of Wastwater and the surrounding fells on a clear day.',
  'hiking',
  12800,
  930,
  'hard',
  true,
  '[
    {"lat":54.4329,"lng":-3.2955,"title":"Wasdale Head car park"},
    {"lat":54.4398,"lng":-3.2787,"title":"Brackenclose"},
    {"lat":54.4451,"lng":-3.2536,"title":"Brown Tongue"},
    {"lat":54.4490,"lng":-3.2408,"title":"Hollow Stones"},
    {"lat":54.4543,"lng":-3.2113,"title":"Scafell Pike summit (978m)"},
    {"lat":54.4329,"lng":-3.2955,"title":"Wasdale Head car park"}
  ]'::jsonb,
  now() - interval '45 days'
),

-- 2 ─ Ben Nevis Tourist Path (Scottish Highlands)
(
  'b1000000-0000-0000-0000-000000000002',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Ben Nevis via the Mountain Track',
  'The Mountain Track (often called the Tourist Path) is the most popular route '
  'to the summit of the UK''s highest mountain. Well-maintained zigzag path '
  'with a final boulder scramble to the plateau. Expect dramatic views and '
  'rapidly changing weather — always carry full waterproofs.',
  'hiking',
  17400,
  1350,
  'hard',
  true,
  '[
    {"lat":56.7990,"lng":-5.0968,"title":"Ben Nevis Visitor Centre, Fort William"},
    {"lat":56.7968,"lng":-5.0834,"title":"Glen Nevis bridge"},
    {"lat":56.7931,"lng":-5.0679,"title":"Lochan Meall an t-Suidhe"},
    {"lat":56.7961,"lng":-5.0432,"title":"Red Burn junction"},
    {"lat":56.7968,"lng":-5.0034,"title":"Ben Nevis summit (1345m)"},
    {"lat":56.7990,"lng":-5.0968,"title":"Ben Nevis Visitor Centre"}
  ]'::jsonb,
  now() - interval '38 days'
),

-- 3 ─ Snowdon via Pyg Track (North Wales)
(
  'b1000000-0000-0000-0000-000000000003',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Snowdon via Pyg Track & Miners'' Track',
  'A superb horseshoe combining the dramatic Pyg Track on the ascent with '
  'the gentler Miners'' Track descent beside the glacial lakes of Glaslyn and Llydaw. '
  'The scramble to the summit ridge on the Pyg Track is the highlight — '
  'exposed but non-technical.',
  'hiking',
  11600,
  1020,
  'hard',
  true,
  '[
    {"lat":53.0714,"lng":-4.0215,"title":"Pen-y-Pass car park"},
    {"lat":53.0714,"lng":-4.0308,"title":"Pyg Track junction"},
    {"lat":53.0706,"lng":-4.0528,"title":"Bwlch y Moch saddle"},
    {"lat":53.0685,"lng":-4.0763,"title":"Snowdon / Yr Wyddfa summit (1085m)"},
    {"lat":53.0697,"lng":-4.0624,"title":"Glaslyn lake"},
    {"lat":53.0694,"lng":-4.0427,"title":"Llyn Llydaw dam"},
    {"lat":53.0714,"lng":-4.0215,"title":"Pen-y-Pass car park"}
  ]'::jsonb,
  now() - interval '30 days'
),

-- 4 ─ Helvellyn via Striding Edge (Lake District, England)
(
  'b1000000-0000-0000-0000-000000000004',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Helvellyn via Striding Edge',
  'One of England''s finest mountain walks. Striding Edge is a narrow, airy arête '
  'that requires careful hands-and-feet scrambling in places — thrilling in clear '
  'conditions, serious in ice or high wind. The return via Swirral Edge completes '
  'a perfect horseshoe above Red Tarn.',
  'hiking',
  14200,
  760,
  'expert',
  true,
  '[
    {"lat":54.5446,"lng":-2.9546,"title":"Glenridding village car park"},
    {"lat":54.5380,"lng":-2.9678,"title":"Mires Beck bridge"},
    {"lat":54.5332,"lng":-2.9892,"title":"Hole-in-the-Wall"},
    {"lat":54.5304,"lng":-3.0072,"title":"Striding Edge (east end)"},
    {"lat":54.5272,"lng":-3.0156,"title":"Helvellyn summit (950m)"},
    {"lat":54.5295,"lng":-3.0083,"title":"Swirral Edge"},
    {"lat":54.5344,"lng":-3.0022,"title":"Catstye Cam"},
    {"lat":54.5446,"lng":-2.9546,"title":"Glenridding village car park"}
  ]'::jsonb,
  now() - interval '22 days'
),

-- 5 ─ Pen y Fan via Corn Du (Brecon Beacons, Wales)
(
  'b1000000-0000-0000-0000-000000000005',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Pen y Fan & Corn Du from Pont ar Daf',
  'The most popular approach to the highest point in southern Britain. '
  'A broad, clearly signed path climbs steadily to the distinctive flat-topped '
  'summits of Corn Du and Pen y Fan with sweeping views over the Usk Valley. '
  'Suitable for well-equipped beginners.',
  'hiking',
  13200,
  610,
  'moderate',
  true,
  '[
    {"lat":51.8777,"lng":-3.4448,"title":"Pont ar Daf car park (A470)"},
    {"lat":51.8801,"lng":-3.4421,"title":"Blaen Taf Fawr stream crossing"},
    {"lat":51.8845,"lng":-3.4323,"title":"Tommy Jones Obelisk"},
    {"lat":51.8854,"lng":-3.4333,"title":"Corn Du summit (873m)"},
    {"lat":51.8833,"lng":-3.4367,"title":"Pen y Fan summit (886m)"},
    {"lat":51.8809,"lng":-3.4423,"title":"Cribyn col"},
    {"lat":51.8777,"lng":-3.4448,"title":"Pont ar Daf car park"}
  ]'::jsonb,
  now() - interval '18 days'
),

-- 6 ─ Yorkshire Three Peaks (Yorkshire Dales, England)
(
  'b1000000-0000-0000-0000-000000000006',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Yorkshire Three Peaks Challenge',
  'The classic challenge: Pen-y-ghent, Whernside, and Ingleborough in a single day '
  '(typically under 12 hours). 39 km with 1600 m of ascent across limestone plateau, '
  'peat moorland, and gritstone ridges. Start and finish at Horton-in-Ribblesdale. '
  'Bring plenty of food, water, and navigate carefully in mist.',
  'hiking',
  39200,
  1600,
  'hard',
  true,
  '[
    {"lat":54.1503,"lng":-2.3048,"title":"Horton-in-Ribblesdale, Crown Hotel"},
    {"lat":54.1601,"lng":-2.2833,"title":"Pen-y-ghent summit (694m)"},
    {"lat":54.1812,"lng":-2.3244,"title":"Ribblehead Viaduct"},
    {"lat":54.1985,"lng":-2.3929,"title":"Whernside summit (736m)"},
    {"lat":54.2042,"lng":-2.3778,"title":"Ribblehead"},
    {"lat":54.1978,"lng":-2.3720,"title":"Chapel-le-Dale"},
    {"lat":54.1774,"lng":-2.3771,"title":"Ingleborough summit (723m)"},
    {"lat":54.1503,"lng":-2.3048,"title":"Horton-in-Ribblesdale, Crown Hotel"}
  ]'::jsonb,
  now() - interval '14 days'
),

-- 7 ─ Kinder Scout Horseshoe (Peak District, England)
(
  'b1000000-0000-0000-0000-000000000007',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Kinder Scout via Grindsbrook & Ringing Roger',
  'A circular route over the highest point in the Peak District, crossing the '
  'atmospheric peat moorland of Kinder plateau. The ascent via Grindsbrook Clough '
  'is steep and dramatic; the return via Ringing Roger gives fine views over Edale.',
  'hiking',
  14600,
  580,
  'moderate',
  true,
  '[
    {"lat":53.3618,"lng":-1.8146,"title":"Edale village car park"},
    {"lat":53.3649,"lng":-1.8063,"title":"Grindsbrook Booth"},
    {"lat":53.3739,"lng":-1.8004,"title":"Grindsbrook Clough"},
    {"lat":53.3845,"lng":-1.8743,"title":"Kinder Low (633m)"},
    {"lat":53.3878,"lng":-1.8669,"title":"Kinder Downfall waterfall"},
    {"lat":53.3902,"lng":-1.7957,"title":"Kinder Scout (636m)"},
    {"lat":53.3781,"lng":-1.7923,"title":"Ringing Roger"},
    {"lat":53.3618,"lng":-1.8146,"title":"Edale village car park"}
  ]'::jsonb,
  now() - interval '10 days'
),

-- 8 ─ Old Man of Coniston (Lake District, England)
(
  'b1000000-0000-0000-0000-000000000008',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Old Man of Coniston from the village',
  'A straightforward but rewarding ascent of the iconic Coniston fells above '
  'Coniston village. The broad stony track passes old copper mine workings '
  'before the final pull to the summit. Spectacular views of Coniston Water '
  'and the Langdale Pikes. Great introduction to Lake District hiking.',
  'hiking',
  9800,
  750,
  'easy',
  true,
  '[
    {"lat":54.3706,"lng":-3.0779,"title":"Coniston village car park"},
    {"lat":54.3728,"lng":-3.0873,"title":"Sun Hotel path junction"},
    {"lat":54.3741,"lng":-3.0965,"title":"Miners Bridge"},
    {"lat":54.3695,"lng":-3.1089,"title":"Low Water"},
    {"lat":54.3686,"lng":-3.1162,"title":"Old Man of Coniston summit (803m)"},
    {"lat":54.3706,"lng":-3.0779,"title":"Coniston village car park"}
  ]'::jsonb,
  now() - interval '7 days'
),

-- 9 ─ Dunkery Beacon (Exmoor, Somerset)
(
  'b1000000-0000-0000-0000-000000000009',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Dunkery Beacon from Webbers Post',
  'A gentle moorland walk to the highest point on Exmoor, crossing open heather '
  'plateau with far-reaching views to Wales and the Bristol Channel on a clear day. '
  'The path is well-waymarked and the going is mostly easy. Red deer are regularly '
  'spotted on the open moorland.',
  'hiking',
  9400,
  390,
  'easy',
  true,
  '[
    {"lat":51.2127,"lng":-3.5771,"title":"Webbers Post car park"},
    {"lat":51.2139,"lng":-3.5638,"title":"Cloutsham Ball"},
    {"lat":51.2195,"lng":-3.5612,"title":"Stoke Pero Common"},
    {"lat":51.2260,"lng":-3.5889,"title":"Dunkery Beacon summit (519m)"},
    {"lat":51.2127,"lng":-3.5771,"title":"Webbers Post car park"}
  ]'::jsonb,
  now() - interval '4 days'
),

-- 10 ─ Goatfell (Isle of Arran, Scotland)
(
  'b1000000-0000-0000-0000-000000000010',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Goatfell from Brodick',
  'The most popular ascent on the Isle of Arran, starting directly from Brodick '
  'Castle and climbing through woodland before gaining the open granite ridge. '
  'The summit panorama is breathtaking — the Firth of Clyde, Kintyre, Jura, '
  'and on clear days as far as Ireland. Take the ferry from Ardrossan to Brodick.',
  'hiking',
  11800,
  870,
  'moderate',
  true,
  '[
    {"lat":55.5761,"lng":-5.1414,"title":"Brodick Castle, Isle of Arran"},
    {"lat":55.5823,"lng":-5.1579,"title":"Cnocan Burn bridge"},
    {"lat":55.5882,"lng":-5.1726,"title":"Meall Breac"},
    {"lat":55.6003,"lng":-5.1906,"title":"North Goatfell (818m)"},
    {"lat":55.5979,"lng":-5.1936,"title":"Goatfell summit (874m)"},
    {"lat":55.5761,"lng":-5.1414,"title":"Brodick Castle"}
  ]'::jsonb,
  now() - interval '1 day'
)

on conflict (id) do nothing;

-- ─── Sample ratings (so Discover shows star counts) ──────────────────────────

-- We need a second user to rate the demo user's routes
do $$
begin
  if not exists (
    select 1 from auth.users where id = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'
  ) then
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      'authenticated', 'authenticated',
      'hiker@roamfree.app',
      crypt('hiker1234', gen_salt('bf')),
      now(),
      '{"username":"peak_hiker"}'::jsonb,
      now(), now()
    );
  end if;
end $$;

insert into public.route_ratings (route_id, user_id, rating, review) values
  ('b1000000-0000-0000-0000-000000000001', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 5,
   'Absolutely stunning. The views from the summit were worth every metre of ascent.'),
  ('b1000000-0000-0000-0000-000000000002', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 5,
   'A must-do for any serious hiker. The final boulder field is tricky but rewarding.'),
  ('b1000000-0000-0000-0000-000000000003', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 5,
   'Pyg Track up, Miners'' Track down — perfect combination. Scramble near top is great.'),
  ('b1000000-0000-0000-0000-000000000004', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 5,
   'Striding Edge is sensational. Avoid in wet or icy conditions — it''s serious then.'),
  ('b1000000-0000-0000-0000-000000000005', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 4,
   'Great introduction to the Brecons. Path is a bit eroded near the summit.'),
  ('b1000000-0000-0000-0000-000000000006', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 4,
   'Completed it in 9.5 hours. Harder than expected due to boggy sections on Whernside.'),
  ('b1000000-0000-0000-0000-000000000007', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 4,
   'The plateau navigation in mist is challenging — bring a map and compass.'),
  ('b1000000-0000-0000-0000-000000000008', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 5,
   'Perfect family route — kids managed it well. The mine workings are fascinating.'),
  ('b1000000-0000-0000-0000-000000000009', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 4,
   'Lovely gentle walk with great views. Saw a herd of red deer near the summit.'),
  ('b1000000-0000-0000-0000-000000000010', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 5,
   'Worth the ferry trip. One of the best views in Scotland on a clear day.')
on conflict (route_id, user_id) do nothing;
