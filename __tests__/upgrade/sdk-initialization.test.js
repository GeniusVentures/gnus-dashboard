// Test SDK initialization with new function signatures
const fs = require('fs');
const path = require('path');

describe('SDK Initialization Tests', () => {
  test('SDK initialization function should be properly defined', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // Verify GeniusSDKInit is defined with correct signature
    expect(content).toMatch(/GeniusSDKInit.*const char\*.*const char\*.*bool.*bool.*uint16_t.*bool/);
    
    // Verify createNode function exists
    expect(content).toMatch(/const createNode.*async/);
    
    // Verify initialization is called with correct parameters
    expect(content).toMatch(/GeniusSDKInit\s*\(/);
  });

  test('SDK initialization should handle basePath correctly', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // Should set up basePath
    expect(content).toMatch(/basePath.*path\.join.*process\.cwd.*data/);
    
    // Should pass basePath to GeniusSDKInit
    expect(content).toMatch(/GeniusSDKInit\s*\(\s*basePath/);
  });

  test('SDK initialization should handle error cases', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // Should have try-catch for initialization
    expect(content).toMatch(/try[\s\S]*GeniusSDKInit[\s\S]*catch/);
    
    // Should check for initialization failure
    expect(content).toMatch(/if\s*\(\s*!result\s*\)/);
    expect(content).toMatch(/throw new Error.*initialization failed/);
  });

  test('SDK should load correct library for platform', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // Should handle Windows platform
    expect(content).toMatch(/case\s+["']win32["'][\s\S]*GeniusSDK\.dll/);
    
    // Should handle macOS platform
    expect(content).toMatch(/case\s+["']darwin["'][\s\S]*libGeniusSDK\.dylib/);
    
    // Should handle Linux platform
    expect(content).toMatch(/case\s+["']linux["'][\s\S]*libGeniusSDK\.so/);
    
    // Should throw error for unsupported platforms
    expect(content).toMatch(/throw new Error.*Unsupported platform/);
  });

  test('SDK initialization parameters should be in correct order', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // Find the actual GeniusSDKInit call (not the signature definition)
    const initCallMatch = content.match(/GeniusSDKInit\s*\(\s*basePath[^;]+\)/);
    expect(initCallMatch).toBeTruthy();
    
    if (initCallMatch) {
      const initCall = initCallMatch[0];
      
      // Should have 6 parameters: basePath, ethPrivateKey, autodht, process, baseport, is_full_node
      const params = initCall.match(/\(([^)]+)\)/)[1].split(',');
      expect(params.length).toBe(6);
      
      // First parameter should be basePath
      expect(params[0].trim()).toMatch(/basePath/);
      
      // Second parameter should be ethPrivateKey
      expect(params[1].trim()).toMatch(/ethPrivateKey/);
      
      // Third parameter should be boolean (autodht)
      expect(params[2].trim()).toMatch(/true|false/);
      
      // Fourth parameter should be boolean (process)
      expect(params[3].trim()).toMatch(/true|false/);
      
      // Fifth parameter should be number (baseport)
      expect(params[4].trim()).toMatch(/\d+/);
      
      // Sixth parameter should be boolean (is_full_node)
      expect(params[5].trim()).toMatch(/true|false/);
    }
  });

  test('SDK shutdown function should be properly defined', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // Verify GeniusSDKShutdown is defined
    expect(content).toMatch(/GeniusSDKShutdown.*void/);
    
    // Verify shutdownGnus alias exists
    expect(content).toMatch(/shutdownGnus.*GeniusSDKShutdown/);
    
    // Verify it's exported (check for export statement with shutdownGnus)
    expect(content).toMatch(/export\s*\{[\s\S]*shutdownGnus[\s\S]*\}/);
  });

  test('SDK struct types should be properly initialized', () => {
    const nodePath = path.join(__dirname, '../../functions/ipfs/node.ts');
    const content = fs.readFileSync(nodePath, 'utf8');
    
    // Verify GeniusTokenValue struct is defined
    expect(content).toMatch(/GeniusTokenValue.*koffi\.struct/);
    expect(content).toMatch(/value.*koffi\.array.*char.*22/);
    
    // Verify GeniusTokenID struct is defined
    expect(content).toMatch(/GeniusTokenID.*koffi\.struct/);
    expect(content).toMatch(/data.*koffi\.array.*unsigned char.*32/);
  });
});