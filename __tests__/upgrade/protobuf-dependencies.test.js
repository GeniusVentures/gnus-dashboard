// Simple dependency validation test
const fs = require('fs');
const path = require('path');

// Read package.json directly
const packageJsonPath = path.join(__dirname, '../../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

describe('Protobuf Dependencies Upgrade', () => {
  test('should have protobuf-ts runtime version 2.11.1 or later', () => {
    const runtimeVersion = packageJson.dependencies['@protobuf-ts/runtime'];
    expect(runtimeVersion).toBeDefined();
    
    // Extract version number (remove ^ or ~ prefix)
    const versionNumber = runtimeVersion.replace(/[\^~]/, '');
    const [major, minor, patch] = versionNumber.split('.').map(Number);
    
    // Check version is 2.11.1 or later
    expect(major).toBeGreaterThanOrEqual(2);
    if (major === 2) {
      expect(minor).toBeGreaterThanOrEqual(11);
      if (minor === 11) {
        expect(patch).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test('should have protobuf-ts plugin version 2.11.1 or later', () => {
    const pluginVersion = packageJson.devDependencies['@protobuf-ts/plugin'];
    expect(pluginVersion).toBeDefined();
    
    // Extract version number (remove ^ or ~ prefix)
    const versionNumber = pluginVersion.replace(/[\^~]/, '');
    const [major, minor, patch] = versionNumber.split('.').map(Number);
    
    // Check version is 2.11.1 or later
    expect(major).toBeGreaterThanOrEqual(2);
    if (major === 2) {
      expect(minor).toBeGreaterThanOrEqual(11);
      if (minor === 11) {
        expect(patch).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test('should have koffi dependency for SDK integration', () => {
    const koffiVersion = packageJson.dependencies['koffi'];
    expect(koffiVersion).toBeDefined();
    expect(koffiVersion).toMatch(/^\^?2\./); // Should be version 2.x
  });
});