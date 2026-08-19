-- Migration: 017_seed_data.sql
-- Seed Initial Catalog Data (Themes, Badges, Missions)

-- Themes Catalog
INSERT INTO public.themes (code, name, description, coin_cost, primary_color, accent_color, glow_color, badge_bg, is_default)
VALUES 
  ('theme-crimson', 'AniFlix Crimson (Default)', 'Classic cinema red with deep OLED obsidian background.', 0, '#E50914', '#FFB800', 'rgba(229, 9, 20, 0.4)', '#1A0E10', true),
  ('theme-gold-sun', 'Kurdish Sun Golden', 'Vibrant solar gold celebrating Kurdish cinema culture.', 200, '#FFB800', '#00D2FF', 'rgba(255, 184, 0, 0.45)', '#262010', false),
  ('theme-emerald-night', 'Ramadan Midnight Emerald', 'Lush glowing emerald with gold crescent accents.', 250, '#00E676', '#FFD700', 'rgba(0, 230, 118, 0.45)', '#0F2618', false),
  ('theme-cyberpunk-violet', 'New Year Neon Cyberpunk', 'Electric neon violet with hyper-modern anime styling.', 300, '#9D4EDD', '#FF007F', 'rgba(157, 78, 221, 0.5)', '#221133', false),
  ('theme-sunset-coral', 'Summer Sunset Coral', 'Warm tropical orange with crystal cyan highlights.', 200, '#FF6D00', '#00E5FF', 'rgba(255, 109, 0, 0.45)', '#2A1608', false)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  coin_cost = EXCLUDED.coin_cost,
  primary_color = EXCLUDED.primary_color,
  accent_color = EXCLUDED.accent_color;

-- Badges Catalog
INSERT INTO public.badges (code, name, description, icon, color)
VALUES
  ('b-novice', 'First Stream', 'Streamed your first title on AniFlix', '🎬', '#E50914'),
  ('b-streak-3', '3-Day Fire Streak', 'Logged in for 3 consecutive days', '🔥', '#FF5722'),
  ('b-critic', '5-Star Critic', 'Published a helpful community review', '⭐', '#FFB800'),
  ('b-kurdish-sun', 'Kurdish Sun Legend', 'Participated in the Kurdish Cinema Gala', '☀️', '#FFD700'),
  ('b-vip', 'AniFlix VIP Sovereign', 'Unlocked active VIP Ultra HD status', '👑', '#9C27B0'),
  ('b-night-owl', 'Crescent Night Owl', 'Streamed during Ramadan midnight festival', '🌙', '#00E676'),
  ('b-luminary', 'New Year Luminary', 'Celebrated the New Year premiere event', '🎆', '#9D4EDD')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color;

-- Missions Catalog
INSERT INTO public.missions (code, title, description, reward_coins, reward_xp, target, mission_type)
VALUES
  ('m-daily-1', 'Daily Cinema Explorer', 'Stream any movie or anime for 10+ minutes', 30, 50, 1, 'daily'),
  ('m-daily-2', 'Critique & Rate', 'Rate any movie or write a community review', 40, 60, 1, 'daily'),
  ('m-daily-3', 'Curator', 'Add 2 new titles to your watchlist', 25, 40, 2, 'daily'),
  ('m-weekly-1', 'Weekend Binge Master', 'Watch 5 full episodes across any series', 120, 250, 5, 'weekly'),
  ('m-weekly-2', 'Genre Explorer', 'Explore at least 3 different categories (K-Drama, Anime, Movies)', 100, 200, 3, 'weekly'),
  ('event-kurd-1', 'Festival Streamer', 'Watch 3 different titles during the Kurdish Festival', 250, 350, 3, 'event'),
  ('event-kurd-2', 'Golden Critique', 'Leave a 5-star review on any festival movie', 180, 250, 1, 'event'),
  ('event-ram-1', 'Midnight Binge', 'Stream 4 episodes during evening hours', 300, 400, 4, 'event'),
  ('event-ny-1', 'New Year Countdown Stream', 'Watch the #1 Top Ranked Movie of the Year', 350, 500, 1, 'event'),
  ('event-sum-1', 'Action Marathon', 'Watch 2 blockbuster action movies', 220, 300, 2, 'event')
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  reward_coins = EXCLUDED.reward_coins,
  reward_xp = EXCLUDED.reward_xp,
  target = EXCLUDED.target,
  mission_type = EXCLUDED.mission_type;
