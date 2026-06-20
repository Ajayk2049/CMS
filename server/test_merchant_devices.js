const mongoose = require('mongoose');
const config = require('./config/config');
const Device = require('./models/Device');
const HostApplication = require('./models/HostApplication');
const hostController = require('./controllers/hostController');

async function runTests() {
  console.log('--- Starting Merchant Device Visibility Tests ---');

  try {
    await mongoose.connect(config.mongoUri);
    console.log('[DB] Connected to MongoDB');

    // 1. Setup a dummy merchant user
    const dummyMerchantId = new mongoose.Types.ObjectId();

    // 2. Setup an approved host application for this merchant
    const hostApp = new HostApplication({
      userId: dummyMerchantId,
      outletName: 'Merchant Kiosk Outlet',
      outletDescription: 'Kiosk testing',
      doorNo: '456',
      street: 'Outer Ring Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      zipCode: '560103',
      contactPerson: 'Merchant Owner',
      phone: '9898989898',
      email: 'owner@kiosk.com',
      deviceType: 'tablet',
      quantity: 2,
      status: 'approved'
    });
    await hostApp.save();
    console.log('[Test Setup] Approved host application resolved:', hostApp._id);

    // 3. Provision device IDs for this application
    const device1 = new Device({
      deviceId: 'DEV_TAB_MERC001',
      deviceType: 'tablet',
      hostApplicationId: hostApp._id,
      status: 'offline',
      isActivated: false
    });
    const device2 = new Device({
      deviceId: 'DEV_TAB_MERC002',
      deviceType: 'tablet',
      hostApplicationId: hostApp._id,
      status: 'online',
      isActivated: true
    });
    await device1.save();
    await device2.save();
    console.log('[Test Setup] Deployed 2 devices for host application:', hostApp.outletName);

    // 4. Query endpoint handler getMyDevices using the merchant's mock request
    console.log('\n--- Test Case 1: Query getMyDevices ---');
    const mockReq = {
      user: {
        uid: dummyMerchantId
      }
    };
    const mockRes = {
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      send: function (payload) {
        console.log(`Response Status: ${this.statusCode}`);
        console.log('Response Body:', JSON.stringify(payload));
        if (this.statusCode === 200 && payload.success) {
          const deviceIds = payload.data.map(d => d.deviceId);
          if (deviceIds.includes('DEV_TAB_MERC001') && deviceIds.includes('DEV_TAB_MERC002')) {
            console.log('PASS: getMyDevices successfully returned all provisioned device ID activation codes!');
          } else {
            console.log('FAIL: Missing device IDs in response.');
          }
        } else {
          console.log('FAIL: API returned error status.');
        }
      }
    };

    await hostController.getMyDevices(mockReq, mockRes);

    // Clean up
    await Device.deleteMany({ hostApplicationId: hostApp._id });
    await HostApplication.deleteOne({ _id: hostApp._id });
    console.log('\n[Test Cleanup] Removed dummy test records.');

  } catch (error) {
    console.error('Test Execution Failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('[DB] Connection closed.');
    process.exit(0);
  }
}

runTests();
