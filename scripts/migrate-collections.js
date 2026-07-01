/**
 * Copy data from legacy MongoDB collection names to standard names.
 *
 * Usage:
 *   node scripts/migrate-collections.js
 * Then set in .env: MONGO_USE_LEGACY_COLLECTIONS=0
 */
require("dotenv").config();
const mongoose = require("mongoose");
const {
  COLLECTIONS_LEGACY,
  COLLECTIONS_STANDARD,
} = require("../models/collections");

async function copyCollection(db, fromName, toName) {
  const source = db.collection(fromName);
  const target = db.collection(toName);

  const count = await source.countDocuments();
  if (count === 0) {
    console.log(`  skip ${fromName} (empty)`);
    return;
  }

  const existing = await target.countDocuments();
  if (existing > 0) {
    console.log(`  skip ${fromName} → ${toName} (target already has ${existing} docs)`);
    return;
  }

  const docs = await source.find({}).toArray();
  if (docs.length > 0) {
    await target.insertMany(docs, { ordered: false });
  }

  console.log(`  copied ${docs.length} docs: ${fromName} → ${toName}`);
}

async function run() {
  await mongoose.connect(process.env.DB_URI);
  const db = mongoose.connection.db;

  console.log("Migrating collections to standard names...\n");

  const pairs = Object.keys(COLLECTIONS_STANDARD).map((key) => ({
    from: COLLECTIONS_LEGACY[key],
    to: COLLECTIONS_STANDARD[key],
  }));

  for (const { from, to } of pairs) {
    if (from === to) continue;
    await copyCollection(db, from, to);
  }

  console.log("\nDone. Set MONGO_USE_LEGACY_COLLECTIONS=0 in .env and restart the server.");
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
