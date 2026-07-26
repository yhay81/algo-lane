SELECT
  COUNT(DISTINCT session_hash) AS users,
  COUNT(DISTINCT CASE WHEN name = 'lane_generated' THEN session_hash END) AS lane_generated,
  COUNT(DISTINCT CASE WHEN name = 'history_imported' THEN session_hash END) AS history_imported,
  COUNT(DISTINCT CASE WHEN name = 'problem_opened' THEN session_hash END) AS problem_opened,
  COUNT(DISTINCT CASE WHEN name = 'solved_marked' THEN session_hash END) AS solved_marked,
  COUNT(DISTINCT CASE WHEN name = 'exported' THEN session_hash END) AS exported,
  COUNT(DISTINCT CASE WHEN name = 'returned' THEN session_hash END) AS returned,
  COUNT(DISTINCT CASE WHEN occurred_on >= date('now', '-6 days') THEN session_hash END) AS users_7d,
  COUNT(DISTINCT CASE WHEN name = 'solved_marked' AND occurred_on >= date('now', '-6 days') THEN session_hash END) AS solved_marked_7d
FROM product_events;
