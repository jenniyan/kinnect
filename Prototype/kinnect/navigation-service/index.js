// navigation-service/index.js
// Manages routing requests and generates routes via Google Maps Directions API.
// Routing request lifecycle: pending → accepted → active → completed/cancelled

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const axios   = require('axios');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT_NAV || 3005;

const LOCATION_SERVICE = `http://localhost:${process.env.PORT_LOCATION || 3002}`;
const USER_SERVICE     = `http://localhost:${process.env.PORT_USER    || 3001}`;
const GOOGLE_MAPS_KEY  = process.env.GOOGLE_MAPS_API_KEY;

app.use(cors());
app.use(express.json());

// ── Health ────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true, service: 'navigation-service' }));

// ── Generate route between two lat/lng points ─────────────────
// POST /navigation/route
// Body: { origin: {lat, lng}, destination: {lat, lng}, mode?: 'walking'|'driving' }
app.post('/navigation/route', async (req, res) => {
  const { origin, destination, mode = 'walking' } = req.body;
  if (!origin || !destination) {
    return res.status(400).json({ error: 'origin and destination required' });
  }

  try {
    if (!GOOGLE_MAPS_KEY) {
      // Return a mock route if no API key configured (useful in dev)
      return res.json({
        route: buildMockRoute(origin, destination),
        provider: 'mock',
      });
    }

    const url = 'https://maps.googleapis.com/maps/api/directions/json';
    const gmRes = await axios.get(url, {
      params: {
        origin:      `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        mode,
        key: GOOGLE_MAPS_KEY,
      },
    });

    const data = gmRes.data;
    if (data.status !== 'OK' || !data.routes.length) {
      return res.status(502).json({
        error: `Google Maps returned status: ${data.status}`,
      });
    }

    const route = data.routes[0];
    const leg   = route.legs[0];

    res.json({
      route: {
        polyline:             route.overview_polyline.points,
        distance_m:           leg.distance.value,
        distance_text:        leg.distance.text,
        duration_s:           leg.duration.value,
        duration_text:        leg.duration.text,
        steps: leg.steps.map(s => ({
          instruction: s.html_instructions.replace(/<[^>]+>/g, ''),
          distance:    s.distance.text,
          duration:    s.duration.text,
          start_lat:   s.start_location.lat,
          start_lng:   s.start_location.lng,
        })),
      },
      provider: 'google',
    });
  } catch (err) {
    console.error('[navigation/route]', err.message);
    res.status(502).json({ error: 'Unable to generate route. Try again later.' });
  }
});

// ── Route between two Kinnect users ───────────────────────────
// POST /navigation/route-between-users
// Body: { requester_id, target_id, mode? }
// Looks up both users' live GPS from location-service, then calls Google Maps.
app.post('/navigation/route-between-users', async (req, res) => {
  const { requester_id, target_id, mode = 'walking' } = req.body;
  if (!requester_id || !target_id) {
    return res.status(400).json({ error: 'requester_id and target_id required' });
  }

  try {
    // Fetch both locations in parallel
    const [reqLocRes, tgtLocRes] = await Promise.all([
      axios.get(`${LOCATION_SERVICE}/location/${requester_id}`),
      axios.get(`${LOCATION_SERVICE}/location/${target_id}`),
    ]);

    const origin      = reqLocRes.data;      // { lat, lng, ts }
    const destination = tgtLocRes.data;

    if (!origin || !destination) {
      return res.status(404).json({ error: 'Location unavailable for one or both users' });
    }

    // Re-use the existing route endpoint internally
    const routeRes = await axios.post(
      `http://localhost:${PORT}/navigation/route`,
      { origin, destination, mode }
    );

    res.json({
      ...routeRes.data,
      origin,
      destination,
      requester_id,
      target_id,
    });
  } catch (err) {
    // If location-service returns 404
    if (err.response?.status === 404) {
      return res.status(404).json({ error: 'Location unavailable for routing.' });
    }
    console.error('[route-between-users]', err.message);
    res.status(502).json({ error: 'Unable to generate route. Try again later.' });
  }
});

// ── Geocode a place name to lat/lng ──────────────────────────
// GET /navigation/geocode?address=UCI+Aldrich+Park
app.get('/navigation/geocode', async (req, res) => {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'address required' });

  if (!GOOGLE_MAPS_KEY) {
    return res.json({ lat: 33.6461, lng: -117.8427, formatted_address: address });
  }

  try {
    const gmRes = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      { params: { address, key: GOOGLE_MAPS_KEY } }
    );
    const result = gmRes.data.results?.[0];
    if (!result) return res.status(404).json({ error: 'Address not found' });

    res.json({
      lat:               result.geometry.location.lat,
      lng:               result.geometry.location.lng,
      formatted_address: result.formatted_address,
    });
  } catch (err) {
    console.error('[geocode]', err.message);
    res.status(502).json({ error: 'Geocoding failed' });
  }
});

// ── Helpers ───────────────────────────────────────────────────
function buildMockRoute(origin, destination) {
  const dLat = destination.lat - origin.lat;
  const dLng = destination.lng - origin.lng;
  const distM = Math.sqrt(dLat * dLat + dLng * dLng) * 111_000;
  const walkingSpeedMps = 1.4; // m/s
  const durationS = Math.round(distM / walkingSpeedMps);

  return {
    polyline:      null, // mock — no encoded polyline
    distance_m:    Math.round(distM),
    distance_text: `${(distM / 1000).toFixed(1)} km`,
    duration_s:    durationS,
    duration_text: `${Math.ceil(durationS / 60)} min`,
    steps: [
      {
        instruction: `Head toward destination`,
        distance:    `${(distM / 1000).toFixed(1)} km`,
        duration:    `${Math.ceil(durationS / 60)} min`,
        start_lat:   origin.lat,
        start_lng:   origin.lng,
      },
    ],
  };
}

app.listen(PORT, () => {
  console.log(`✓ navigation-service listening on :${PORT}`);
});
