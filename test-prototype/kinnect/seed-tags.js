// seed-tags.js
// Run from your kinnect/ backend folder:
//   node seed-tags.js

require('dotenv').config();
const { Pool } = require('pg');

const db = new Pool({ connectionString: process.env.USER_DB_URL });

const TAGS = {
  Sports:   ['Pickleball','Tennis','Volleyball','Running','Climbing','Yoga','Soccer','Basketball','Skateboarding'],
  Arts:     ['Photography','Film','Music','Drawing','Writing','Pottery'],
  Outdoors: ['Hiking','Camping','Surfing','Biking','Gardening'],
  Food:     ['Coffee','Brunch','Cooking','Baking','Wine','Vegan'],
  Social:   ['Board Games','Trivia','Dancing','Karaoke','Reading'],
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
           ON CONFLICT (name) DO NOTHING`,
          [name, category]
        );
        if (res.rowCount > 0) {
          console.log(`  ✓ ${category.padEnd(10)} ${name}`);
          inserted++;
        } else {
          console.log(`  · ${category.padEnd(10)} ${name} (already exists)`);
          skipped++;
        }
      }
    }

    console.log(`\nDone. ${inserted} inserted, ${skipped} already existed.`);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await db.end();
  }
}

seed();