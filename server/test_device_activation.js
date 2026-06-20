const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('./config/config');
const Device = require('./models/Device');
const HostApplication = require('./models/HostApplication');
const deviceAuthController = require('./controllers/deviceAuthController');

async function runTests() {
  console.log('--- Starting Device Onboarding & Activation Tests ---');

  try {
    // Connect to database
    await mongoose.connect(config.mongoUri);
    console.log('[DB] Connected to MongoDB');

    // 1. Setup a dummy approved host application
    let hostApp = await HostApplication.findOne({ outletName: 'Test Security Outlet' });
    if (!hostApp) {
      hostApp = new HostApplication({
        userId: new mongoose.Types.ObjectId(),
        outletName: 'Test Security Outlet',
        outletDescription: 'Security testing outlet',
        doorNo: '123',
        street: 'Main Street',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560001',
        contactPerson: 'Tester',
        phone: '9876543210',
        email: 'tester@test.com',
        deviceType: 'tablet',
        quantity: 1,
        status: 'approved'
      });
      await hostApp.save();
    }
    console.log('[Test Setup] Approved host application resolved:', hostApp._id);

    // 2. Setup a dummy unactivated tablet device
    const deviceId = 'DEV_TAB_TEST999';
    await Device.deleteOne({ deviceId }); // Clean slate

    const device = new Device({
      deviceId,
      deviceType: 'tablet',
      hostApplicationId: hostApp._id,
      status: 'offline',
      isActivated: false
    });
    await device.save();
    console.log('[Test Setup] Provisioned dummy device in DB:', deviceId);

    // 3. Test Validation - Missing Fields
    console.log('\n--- Test Case 1: Validation with Missing Fields ---');
    const mockRes1 = {
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      send: function (payload) {
        console.log(`Response Status: ${this.statusCode}`);
        console.log('Response Body:', JSON.stringify(payload));
        if (this.statusCode === 400 && payload.message.includes('Validation failed')) {
          console.log('PASS: Correctly rejected missing payload parameters.');
        } else {
          console.log('FAIL: Unexpected response.');
        }
      }
    };
    await deviceAuthController.activateDevice({ body: { deviceId } }, mockRes1);

    // 4. Test Validation - Password length too short
    console.log('\n--- Test Case 2: Validation with Weak Password (too short) ---');
    const mockRes2 = {
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      send: function (payload) {
        console.log(`Response Status: ${this.statusCode}`);
        console.log('Response Body:', JSON.stringify(payload));
        if (this.statusCode === 400 && payload.message.includes('Bypass password is required')) {
          console.log('PASS: Correctly rejected short password.');
        } else {
          console.log('FAIL: Unexpected response.');
        }
      }
    };
    await deviceAuthController.activateDevice({
      body: { deviceId, hardwareId: 'hw_mac_address_123', deviceType: 'tablet', kioskPassword: '123' }
    }, mockRes2);

    // 5. Test Successful Activation & Token Generation
    console.log('\n--- Test Case 3: Successful Activation & JWT Generation ---');
    let generatedToken = '';
    const mockRes3 = {
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      send: function (payload) {
        console.log(`Response Status: ${this.statusCode}`);
        console.log('Response Body:', JSON.stringify(payload));
        if (this.statusCode === 200 && payload.success) {
          console.log('PASS: Device activated successfully!');
          generatedToken = payload.data.token;
        } else {
          console.log('FAIL: Device failed to activate.');
        }
      }
    };
    await deviceAuthController.activateDevice({
      body: { deviceId, hardwareId: 'hw_mac_address_123', deviceType: 'tablet', kioskPassword: 'pass123' }
    }, mockRes3);

    // 6. Verify Generated Device Token claims
    if (generatedToken) {
      console.log('\n--- Test Case 4: Verify JWT Claims ---');
      try {
        const decoded = jwt.verify(generatedToken, config.jwtSecret);
        console.log('Decoded claims:', JSON.stringify(decoded));
        if (decoded.deviceId === deviceId && decoded.deviceType === 'tablet' && decoded.hostApplicationId === hostApp._id.toString()) {
          console.log('PASS: JWT claims match device metadata perfectly!');
        } else {
          console.log('FAIL: JWT claims mismatch.');
        }
      } catch (err) {
        console.log('FAIL: Failed to verify JWT token:', err.message);
      }
    }

    // 7. Verify device is locked to hardware and rejects different machine ID activation
    console.log('\n--- Test Case 5: Reject activation from a different machine ID ---');
    const mockRes4 = {
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      send: function (payload) {
        console.log(`Response Status: ${this.statusCode}`);
        console.log('Response Body:', JSON.stringify(payload));
        if (this.statusCode === 400 && payload.message.includes('already activated on another physical machine')) {
          console.log('PASS: Successfully locked and protected device from hardware spoofing!');
        } else {
          console.log('FAIL: Spoofed machine ID was not rejected.');
        }
      }
    };
    await deviceAuthController.activateDevice({
      body: { deviceId, hardwareId: 'hw_mac_address_SPOOFED', deviceType: 'tablet', kioskPassword: 'pass123' }
    }, mockRes4);

    // Clean up
    await Device.deleteOne({ deviceId });
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
