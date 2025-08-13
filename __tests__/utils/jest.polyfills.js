/**
 * Jest Polyfills for GNUS Dashboard
 * 
 * This file provides polyfills for browser APIs that are not available in the Jest test environment.
 * It runs before the test framework is set up.
 */

// Polyfill for TextEncoder/TextDecoder (needed for some crypto operations)
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Polyfill for fetch (if not already available)
if (typeof global.fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

// Polyfill for AbortController
if (typeof global.AbortController === 'undefined') {
  global.AbortController = class AbortController {
    constructor() {
      this.signal = {
        aborted: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      };
    }
    
    abort() {
      this.signal.aborted = true;
    }
  };
}

// Polyfill for structuredClone (Node.js < 17)
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Polyfill for performance.now()
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
  };
}

// Polyfill for requestAnimationFrame
if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (callback) => {
    return setTimeout(callback, 16); // ~60fps
  };
}

if (typeof global.cancelAnimationFrame === 'undefined') {
  global.cancelAnimationFrame = (id) => {
    clearTimeout(id);
  };
}

// Polyfill for requestIdleCallback
if (typeof global.requestIdleCallback === 'undefined') {
  global.requestIdleCallback = (callback, options = {}) => {
    const timeout = options.timeout || 0;
    const start = performance.now();
    
    return setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining() {
          return Math.max(0, 50 - (performance.now() - start));
        }
      });
    }, timeout);
  };
}

if (typeof global.cancelIdleCallback === 'undefined') {
  global.cancelIdleCallback = (id) => {
    clearTimeout(id);
  };
}

// Polyfill for Blob
if (typeof global.Blob === 'undefined') {
  global.Blob = class Blob {
    constructor(parts = [], options = {}) {
      this.parts = parts;
      this.type = options.type || '';
      this.size = parts.reduce((acc, part) => {
        if (typeof part === 'string') {
          return acc + part.length;
        }
        return acc + (part.length || 0);
      }, 0);
    }
    
    text() {
      return Promise.resolve(this.parts.join(''));
    }
    
    arrayBuffer() {
      const text = this.parts.join('');
      const buffer = new ArrayBuffer(text.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < text.length; i++) {
        view[i] = text.charCodeAt(i);
      }
      return Promise.resolve(buffer);
    }
  };
}

// Polyfill for FormData
if (typeof global.FormData === 'undefined') {
  global.FormData = class FormData {
    constructor() {
      this.data = new Map();
    }
    
    append(name, value) {
      if (this.data.has(name)) {
        const existing = this.data.get(name);
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          this.data.set(name, [existing, value]);
        }
      } else {
        this.data.set(name, value);
      }
    }
    
    get(name) {
      const value = this.data.get(name);
      return Array.isArray(value) ? value[0] : value;
    }
    
    getAll(name) {
      const value = this.data.get(name);
      return Array.isArray(value) ? value : [value];
    }
    
    has(name) {
      return this.data.has(name);
    }
    
    delete(name) {
      this.data.delete(name);
    }
    
    set(name, value) {
      this.data.set(name, value);
    }
    
    entries() {
      return this.data.entries();
    }
    
    keys() {
      return this.data.keys();
    }
    
    values() {
      return this.data.values();
    }
  };
}

// Polyfill for Headers
if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init = {}) {
      this.map = new Map();
      
      if (init) {
        if (init instanceof Headers) {
          init.forEach((value, name) => {
            this.append(name, value);
          });
        } else if (Array.isArray(init)) {
          init.forEach(([name, value]) => {
            this.append(name, value);
          });
        } else {
          Object.entries(init).forEach(([name, value]) => {
            this.append(name, value);
          });
        }
      }
    }
    
    append(name, value) {
      const normalizedName = name.toLowerCase();
      const existing = this.map.get(normalizedName);
      this.map.set(normalizedName, existing ? `${existing}, ${value}` : value);
    }
    
    delete(name) {
      this.map.delete(name.toLowerCase());
    }
    
    get(name) {
      return this.map.get(name.toLowerCase()) || null;
    }
    
    has(name) {
      return this.map.has(name.toLowerCase());
    }
    
    set(name, value) {
      this.map.set(name.toLowerCase(), value);
    }
    
    forEach(callback, thisArg) {
      this.map.forEach((value, name) => {
        callback.call(thisArg, value, name, this);
      });
    }
    
    entries() {
      return this.map.entries();
    }
    
    keys() {
      return this.map.keys();
    }
    
    values() {
      return this.map.values();
    }
  };
}

// Polyfill for Response
if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body = null, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || 'OK';
      this.headers = new Headers(init.headers);
      this.ok = this.status >= 200 && this.status < 300;
      this.redirected = false;
      this.type = 'default';
      this.url = '';
    }
    
    json() {
      return Promise.resolve(JSON.parse(this.body || '{}'));
    }
    
    text() {
      return Promise.resolve(this.body || '');
    }
    
    arrayBuffer() {
      const text = this.body || '';
      const buffer = new ArrayBuffer(text.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < text.length; i++) {
        view[i] = text.charCodeAt(i);
      }
      return Promise.resolve(buffer);
    }
    
    blob() {
      return Promise.resolve(new Blob([this.body || '']));
    }
    
    clone() {
      return new Response(this.body, {
        status: this.status,
        statusText: this.statusText,
        headers: this.headers
      });
    }
  };
}

// Polyfill for Request
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = typeof input === 'string' ? input : input.url;
      this.method = init.method || 'GET';
      this.headers = new Headers(init.headers);
      this.body = init.body || null;
      this.mode = init.mode || 'cors';
      this.credentials = init.credentials || 'same-origin';
      this.cache = init.cache || 'default';
      this.redirect = init.redirect || 'follow';
      this.referrer = init.referrer || '';
      this.integrity = init.integrity || '';
    }
    
    clone() {
      return new Request(this.url, {
        method: this.method,
        headers: this.headers,
        body: this.body,
        mode: this.mode,
        credentials: this.credentials,
        cache: this.cache,
        redirect: this.redirect,
        referrer: this.referrer,
        integrity: this.integrity
      });
    }
  };
}
