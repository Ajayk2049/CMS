const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables from .env.dev
const envPath = path.resolve(__dirname, '..', 'config', '.env.dev');
dotenv.config({ path: envPath });

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error('MONGO_URI not found in environment');
  process.exit(1);
}

console.log('Connecting to database...');
mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Connected. Fetching collections...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections. Clearing documents...`);
    
    for (const col of collections) {
      console.log(`Clearing collection: ${col.name}`);
      try {
        await mongoose.connection.db.collection(col.name).deleteMany({});
        console.log(`Cleared: ${col.name}`);
      } catch (err) {
        console.error(`Failed to clear ${col.name}:`, err.message);
      }
    }
    
    console.log('All collections cleared successfully.');
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error occurred:', err);
    process.exit(1);
  });
