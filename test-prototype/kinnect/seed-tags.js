// seed-tags.js
// Run from your kinnect/ backend folder:
//   node seed-tags.js

require('dotenv').config();
const { Pool } = require('pg');

const db = new Pool({ connectionString: process.env.USER_DB_URL });

const TAGS = {
  Sports: [
    'Pickleball','Tennis','Volleyball','Running','Climbing','Yoga',
    'Soccer','Basketball','Skateboarding','Cycling','Swimming',
    'Martial Arts','Golf','Frisbee','Badminton','Weightlifting',
  ],
  Outdoors: [
    'Hiking','Camping','Surfing','Biking','Gardening',
    'Fishing','Kayaking','Rock Climbing','Birdwatching','Skiing','Snowboarding',
  ],
  Arts: [
    'Photography','Film','Music','Drawing','Writing','Pottery',
    'Dance','Theater','Fashion','Design','Architecture','Painting','Sculpture',
  ],
  Food: [
    'Coffee','Brunch','Cooking','Baking','Wine','Vegan',
    'Street Food','Meal Prep','Cocktails','Tea','Ramen','Sushi',
  ],
  Social: [
    'Board Games','Trivia','Dancing','Karaoke','Reading',
    'Networking','Travel','Volunteering','Concerts','Nightlife','Parties',
  ],
  Gaming: [
    'Video Games','Chess','Poker','Tabletop RPG','Escape Rooms',
    'Arcade','Speedrunning','Trading Card Games','VR Gaming',
  ],
  Study: [
    'Studying','Tutoring','Math','Languages','Science',
    'History','Coding','Book Club','Debate','Law','Medicine',
    'Engineering','Economics','Philosophy','SAT/ACT Prep',
  ],
  Wellness: [
    'Meditation','Journaling','Nutrition','Therapy','Breathwork',
    'Cold Plunge','Stretching','Sleep','Gratitude','Sobriety',
  ],
  Tech: [
    'Programming','AI / ML','Startups','Hardware','Robotics',
    'Crypto','Cybersecurity','3D Printing','Open Source','Product Design',
  ],
  Culture: [
    'Movies','TV Shows','Anime','Podcasts','Museums',
    'Art Galleries','Comedy','Poetry','Zines','Astrology',
  ],
};

async function seed() {
  const client = await db.connect();
  try {
    let inserted = 0;
    let skipped  = 0;

    for (const [category, names] of Object.entries(TAGS)) {
      for (const name of names) {
        const res = await client.query(
          `INSERT INTO tags (name, category, is_custom)
           VALUES ($1, $2, false)
           ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category`,
          [name, category]
        );
        if (res.rowCount > 0) {
          console.log(`  ✓ ${category.padEnd(12)} ${name}`);
          inserted++;
        } else {
          console.log(`  · ${category.padEnd(12)} ${name} (already exists)`);
          skipped++;
        }
      }
    }

    const total = Object.values(TAGS).flat().length;
    console.log(`\nDone. ${inserted} upserted, ${skipped} skipped. ${total} total tags.`);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await db.end();
  }
}

seed();