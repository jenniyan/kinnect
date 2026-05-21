// video-service/index.js
// Location-anchored video posts: signed R2 upload URLs, metadata storage,
// proximity queries, like/unlike, delete.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express   = require('express');
const { Pool }  = require('pg');
const axios     = require('axios');
const cors      = require('cors');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { createPresignedPost }           = require('@aws-sdk/s3-request-presigner');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl }                  = require('@aws-sdk/s3-request-presigner');

const app  = express();
const PORT = process.env.PORT_VIDEO || 3006;

const db = new Pool({ connectionString: process.env.USER_DB_URL });

const USER_SERVICE     = `http://localhost:${process.env.PORT_USER     || 3001}`;
const LOCATION_SERVICE = `http://localhost:${process.env.PORT_LOCATION || 3002}`;

// Cloudflare R2 client (S3-compatible)
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || 'https://example.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID     || 'dev_key',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'dev_secret',
  },
});
const R2_BUCKET = process.env.R2_BUCKET || 'kinnect-media';
const R2_PUBLIC = process.env.R2_PUBLIC_URL || 'https://example.r2.dev';

app.use(cors());
app.use(express.json());

// ── Health ────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true, service: 'video-service' }));

// ── Generate signed upload URL ────────────────────────────────
// POST /media/upload-url
// Body: { filename, gps_lat, gps_lng, visibility?, caption? }
// Returns a pre-signed PUT URL the client uploads to directly (no server relay).
app.post('/media/upload-url', async (req, res) => {
  const userId = req.query.user_id;
  const { filename, gps_lat, gps_lng, visibility = 'nearby', caption = '' } = req.body;

  if (!filename || gps_lat == null || gps_lng == null) {
    return res.status(400).json({ error: 'filename, gps_lat, gps_lng required' });
  }

  // Build a safe R2 object key
  const ts    = Date.now();
  const safe  = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const r2Key = `users/${userId}/${ts}_${safe}`;

  try {
    const signedUrl = await getSignedUrl(
      r2,
      new PutObjectCommand({
        Bucket:      R2_BUCKET,
        Key:         r2Key,
        ContentType: 'video/mp4',
        Metadata: {
          user_id:    userId,
          gps_lat:    String(gps_lat),
          gps_lng:    String(gps_lng),
          visibility,
          caption,
        },
      }),
      { expiresIn: 900 } // 15 minutes
    );

    res.json({ signed_url: signedUrl, r2_key: r2Key, expires_in: 900 });
  } catch (err) {
    console.error('[upload-url]', err.message);
    // In dev mode without real R2 creds, return a mock URL
    res.json({
      signed_url: `http://localhost:${PORT}/dev/mock-upload/${r2Key}`,
      r2_key: r2Key,
      expires_in: 900,
      _dev_mode: true,
    });
  }
});

// ── Dev-mode mock upload endpoint ────────────────────────────
// PUT /dev/mock-upload/*  (accepts binary, does nothing, returns 200)
app.put('/dev/mock-upload/*', (req, res) => {
  res.status(200).send('OK');
});

// ── Confirm upload & save metadata ───────────────────────────
// POST /media/confirm
// Body: { r2_key, lat, lng, visibility, caption?, tag_names?: string[], trigger_radius_m? }
app.post('/media/confirm', async (req, res) => {
  const userId = req.query.user_id;
  const {
    r2_key, lat, lng,
    visibility = 'nearby',
    caption = '',
    tag_names = [],
    trigger_radius_m = 300,
  } = req.body;

  if (!r2_key || lat == null || lng == null) {
    return res.status(400).json({ error: 'r2_key, lat, lng required' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Insert video metadata
    const vidRes = await client.query(
      `INSERT INTO videos (user_id, r2_key, lat, lng, trigger_radius_m, caption, visibility)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, r2_key, lat, lng, caption, visibility, created_at`,
      [userId, r2_key, lat, lng, trigger_radius_m, caption, visibility]
    );
    const video = vidRes.rows[0];

    // Associate tags (if provided)
    if (tag_names.length > 0) {
      const tagRes = await axios.post(
        `http://localhost:${process.env.PORT_TAG || 3003}/tags/resolve`,
        { names: tag_names }
      );
      for (const tag of tagRes.data.tags) {
        await client.query(
          'INSERT INTO video_tags (video_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [video.id, tag.id]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ video_id: video.id, video });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[media/confirm]', err.message);
    res.status(500).json({ error: 'Upload failed' });
  } finally {
    client.release();
  }
});

// ── Get signed playback URL ───────────────────────────────────
// GET /media/:videoId/url
app.get('/media/:videoId/url', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT r2_key, user_id, visibility FROM videos WHERE id = $1',
      [req.params.videoId]
    );
    const video = result.rows[0];
    if (!video) return res.status(404).json({ error: 'Video not found' });

    let playbackUrl;
    try {
      playbackUrl = await getSignedUrl(
        r2,
        new GetObjectCommand({ Bucket: R2_BUCKET, Key: video.r2_key }),
        { expiresIn: 3600 }
      );
    } catch {
      // Dev fallback
      playbackUrl = `${R2_PUBLIC}/${video.r2_key}`;
    }

    res.json({ url: playbackUrl, expires_in: 3600 });
  } catch (err) {
    console.error('[media url]', err.message);
    res.status(500).json({ error: 'Failed to get playback URL' });
  }
});

// ── Query videos near a location ─────────────────────────────
// GET /videos/nearby?lat=33.6&lng=-117.8&radius_m=500&user_id=X
// Returns videos whose trigger radius overlaps the user's position,
// respecting block lists and visibility.
app.get('/videos/nearby', async (req, res) => {
  const userId = req.query.user_id;
  const { lat, lng, radius_m = 500 } = req.query;

  if (lat == null || lng == null) {
    return res.status(400).json({ error: 'lat and lng required' });
  }

  try {
    // Haversine-based proximity query using PostgreSQL
    // earth_distance extension not guaranteed; use basic trig approximation
    const result = await db.query(
      `SELECT v.id, v.user_id, v.r2_key, v.lat, v.lng,
              v.trigger_radius_m, v.caption, v.visibility, v.like_count, v.created_at,
              COALESCE(json_agg(DISTINCT jsonb_build_object('name', t.name)) FILTER (WHERE t.id IS NOT NULL), '[]') AS tags,
              -- approximate distance in meters using equirectangular projection
              111320 * SQRT(
                POWER(($1::float - v.lat), 2) +
                POWER(($2::float - v.lng) * COS(RADIANS(v.lat)), 2)
              ) AS distance_m
       FROM videos v
       LEFT JOIN video_tags vt ON vt.video_id = v.id
       LEFT JOIN tags t ON t.id = vt.tag_id
       WHERE
         -- Within combined radius: user's search radius + video's trigger radius
         111320 * SQRT(
           POWER(($1::float - v.lat), 2) +
           POWER(($2::float - v.lng) * COS(RADIANS(v.lat)), 2)
         ) <= ($3::int + v.trigger_radius_m)
         -- Not blocked
         AND NOT EXISTS (
           SELECT 1 FROM blocks b
           WHERE (b.blocker_id = v.user_id AND b.blocked_id = $4)
              OR (b.blocker_id = $4 AND b.blocked_id = v.user_id)
         )
       GROUP BY v.id
       ORDER BY distance_m ASC
       LIMIT 50`,
      [parseFloat(lat), parseFloat(lng), parseInt(radius_m), userId]
    );

    res.json({ videos: result.rows });
  } catch (err) {
    console.error('[videos/nearby]', err.message);
    res.status(500).json({ error: 'Nearby video query failed' });
  }
});

// ── Get a single video ────────────────────────────────────────
// GET /videos/:id
app.get('/videos/:id', async (req, res) => {
  const userId = req.query.user_id;
  try {
    const result = await db.query(
      `SELECT v.*, 
         EXISTS(SELECT 1 FROM video_likes vl WHERE vl.video_id = v.id AND vl.user_id = $2) AS liked_by_me,
         COALESCE(json_agg(DISTINCT jsonb_build_object('name', t.name)) FILTER (WHERE t.id IS NOT NULL), '[]') AS tags
       FROM videos v
       LEFT JOIN video_tags vt ON vt.video_id = v.id
       LEFT JOIN tags t ON t.id = vt.tag_id
       WHERE v.id = $1
       GROUP BY v.id`,
      [req.params.id, userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Video not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get video' });
  }
});

// ── Get all videos by a user ──────────────────────────────────
// GET /videos/user/:userId
app.get('/videos/user/:userId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT v.id, v.r2_key, v.lat, v.lng, v.caption, v.visibility, v.like_count, v.created_at
       FROM videos v
       WHERE v.user_id = $1
       ORDER BY v.created_at DESC`,
      [req.params.userId]
    );
    res.json({ videos: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list videos' });
  }
});

// ── Like a video ──────────────────────────────────────────────
// POST /videos/:id/like
app.post('/videos/:id/like', async (req, res) => {
  const userId = req.query.user_id;
  try {
    await db.query(
      'INSERT INTO video_likes (video_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, userId]
    );
    await db.query(
      'UPDATE videos SET like_count = like_count + 1 WHERE id = $1',
      [req.params.id]
    );
    res.json({ liked: true });
  } catch (err) {
    res.status(500).json({ error: 'Like failed' });
  }
});

// ── Unlike a video ────────────────────────────────────────────
// DELETE /videos/:id/like
app.delete('/videos/:id/like', async (req, res) => {
  const userId = req.query.user_id;
  try {
    const result = await db.query(
      'DELETE FROM video_likes WHERE video_id = $1 AND user_id = $2 RETURNING 1',
      [req.params.id, userId]
    );
    if (result.rows.length > 0) {
      await db.query(
        'UPDATE videos SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1',
        [req.params.id]
      );
    }
    res.json({ unliked: true });
  } catch (err) {
    res.status(500).json({ error: 'Unlike failed' });
  }
});

// ── Update video ───────────────────────────────────────────────
// PATCH /videos/:id
// Body: { caption?, visibility? }
app.patch('/videos/:id', async (req, res) => {
  const userId = req.query.user_id;
  const { caption, visibility } = req.body;
  try {
    const result = await db.query(
      `UPDATE videos
       SET caption    = COALESCE($3, caption),
           visibility = COALESCE($4, visibility)
       WHERE id = $1 AND user_id = $2
       RETURNING id, caption, visibility`,
      [req.params.id, userId, caption, visibility]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Video not found or unauthorized' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// ── Delete video ──────────────────────────────────────────────
// DELETE /videos/:id
app.delete('/videos/:id', async (req, res) => {
  const userId = req.query.user_id;
  try {
    const result = await db.query(
      'DELETE FROM videos WHERE id = $1 AND user_id = $2 RETURNING r2_key',
      [req.params.id, userId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Video not found or unauthorized' });
    }
    // Best-effort: delete from R2
    try {
      await r2.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key:    result.rows[0].r2_key,
      }));
    } catch (r2Err) {
      console.warn('[delete video] R2 delete failed (continuing):', r2Err.message);
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error('[delete video]', err.message);
    res.status(500).json({ error: 'Delete failed' });
  }
});

app.listen(PORT, () => {
  console.log(`✓ video-service listening on :${PORT}`);
});
