const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://admin:KFKKI6c0kCen0ey0@ac-ipegaos-shard-00-00.n6xcems.mongodb.net:27017,ac-ipegaos-shard-00-01.n6xcems.mongodb.net:27017,ac-ipegaos-shard-00-02.n6xcems.mongodb.net:27017/CMS_test?ssl=true&replicaSet=atlas-12ucmv-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const userId = new mongoose.Types.ObjectId('6a364c38bbd5fe4a1fb53b82');

  // 1. Rename 'TEst' to 'TEST'
  const updateResult = await mongoose.connection.db.collection('hostapplications').updateOne(
    { userId, outletName: 'TEst' },
    { $set: { outletName: 'TEST' } }
  );
  console.log('Renamed outlet:', updateResult.modifiedCount);

  // 2. Delete other applications for this user (i.e. those not named 'TEST')
  const deleteResult = await mongoose.connection.db.collection('hostapplications').deleteMany(
    { userId, outletName: { $ne: 'TEST' } }
  );
  console.log('Deleted outlets count:', deleteResult.deletedCount);

  // 3. Double check remaining host applications
  const remaining = await mongoose.connection.db.collection('hostapplications').find({ userId }).toArray();
  console.log('Remaining outlets for Ajay:', remaining.map(app => ({ id: app._id, name: app.outletName })));

  await mongoose.disconnect();
}

run().catch(console.error);
