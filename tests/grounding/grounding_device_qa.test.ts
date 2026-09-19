import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseUiAutomatorXml } from '../../src/mobile_bridge/android/uiautomator_parser.js';
import { DeviceManager } from '../../src/mobile_bridge/android/device.js';
import { LogcatStream } from '../../src/mobile_bridge/android/logcat.js';
import { generateSEK } from '../../src/core/grounding/sek.js';
import { computeUIDiff } from '../../src/core/grounding/diff.js';
import { RawNode, TreeSnapshot } from '../../src/core/grounding/types.js';
import * as child_process from 'node:child_process';
import { EventEmitter } from 'node:events';

vi.mock('node:child_process', () => {
  const execMock = vi.fn() as any;
  // Node's util.promisify uses this symbol
  execMock[Symbol.for('nodejs.util.promisify.custom')] = async (cmd: any) => {
    return { stdout: execMock.__mockStdout || '', stderr: '' };
  };
  return {
    exec: execMock,
    spawn: vi.fn(),
  };
});

describe('UiAutomator Parser QA', () => {
  it('should parse escaped XML entities', () => {
    const xml = `<hierarchy rotation="0"><node class="android.widget.TextView" text="John &amp; Doe &lt; 3 &quot;yes&quot; &#039;ok&#039; &apos;fine&apos;" bounds="[0,0][100,100]" /></hierarchy>`;
    const root = parseUiAutomatorXml(xml);
    expect(root.text).toBe('John & Doe < 3 "yes" \'ok\' \'fine\'');
  });

  it('should handle unclosed tags gracefully given regex nature', () => {
    const xml = `<hierarchy><node class="A" text="A"><node class="B" text="B" />`;
    const root = parseUiAutomatorXml(xml);
    expect(root.className).toBe('A');
    expect(root.children[0].className).toBe('B');
  });

  it('should handle negative coordinates and missing bounds', () => {
    const xml = `<hierarchy><node class="Root"><node class="A" bounds="[-50,-10][100,200]" /><node class="B" bounds="" /></node></hierarchy>`;
    const root = parseUiAutomatorXml(xml);
    expect(root.children[0].bounds).toEqual([-50, -10, 100, 200]);
    expect(root.children[1].bounds).toEqual([0, 0, 0, 0]);
  });

  it('should throw if no root node is found or empty hierarchy', () => {
    const xml = `<hierarchy></hierarchy>`;
    expect(() => parseUiAutomatorXml(xml)).toThrow('No root node found');
  });
});

describe('DeviceManager QA', () => {
  let dm: DeviceManager;
  
  beforeEach(() => {
    dm = new DeviceManager();
    vi.clearAllMocks();
  });

  it('should parse multi-device list correctly', async () => {
    const mockOutput = `List of devices attached
emulator-5554          device product:sdk_gphone64_arm64 model:sdk_gphone64_arm64 device:emu64a transport_id:1
1234567890ABCDEF       device usb:338690048X product:pixel model:Pixel_6 device:oriole transport_id:2
offline-device         offline
`;
    const execMock = vi.mocked(child_process.exec) as any;
    execMock.__mockStdout = mockOutput;

    const devices = await dm.discoverDevices();
    expect(devices.length).toBe(2);
    expect(devices[0].id).toBe('emulator-5554');
    expect(devices[0].type).toBe('emulator');
    expect(devices[0].model).toBe('sdk_gphone64_arm64');
    expect(devices[1].id).toBe('1234567890ABCDEF');
    expect(devices[1].type).toBe('physical');
    expect(devices[1].model).toBe('Pixel_6');
  });

  it('should fallback and retry in ensureConnection()', async () => {
    let isAliveCalls = 0;
    vi.spyOn(dm, 'isAlive').mockImplementation(async () => {
      isAliveCalls++;
      return isAliveCalls > 2; // fails first two times, succeeds third time
    });
    vi.spyOn(dm, 'connect').mockImplementation(async () => {
      (dm as any).currentDeviceId = 'emulator-5554';
      return 'emulator-5554';
    });
    
    // forcefully set currentDeviceId
    await dm.connect('emulator-5554');
    const deviceId = await dm.ensureConnection(3);
    
    expect(deviceId).toBe('emulator-5554');
    expect(isAliveCalls).toBe(3);
  });

  it('should return false for isAlive when adb fails', async () => {
    const execMock = vi.mocked(child_process.exec) as any;
    execMock[Symbol.for('nodejs.util.promisify.custom')] = async () => {
      throw new Error('timeout');
    };
    
    await dm.connect('dummy');
    const alive = await dm.isAlive();
    expect(alive).toBe(false);
  });
});

describe('LogcatStream QA', () => {
  it('should handle circular buffer eviction', () => {
    const stream = new LogcatStream('dummy', 5);
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.kill = vi.fn();
    
    vi.mocked(child_process.spawn).mockReturnValue(mockProcess);
    
    stream.start();
    
    // emit 10 lines
    const lines = Array.from({length: 10}, (_, i) => `Line ${i}\n`).join('');
    mockProcess.stdout.emit('data', Buffer.from(lines));
    
    const buffer = stream.getBuffer();
    const resultLines = buffer.split('\n');
    expect(resultLines.length).toBe(5);
    expect(resultLines[0]).toBe('Line 5');
    expect(resultLines[4]).toBe('Line 9');
  });

  it('should filter packages correctly', () => {
    const stream = new LogcatStream('dummy', 10);
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.kill = vi.fn();
    
    vi.mocked(child_process.spawn).mockReturnValue(mockProcess);
    
    stream.start('com.test.app');
    
    const lines = `I/App ( 123): com.test.app started\nD/Other ( 456): random log\nW/App ( 123): com.test.app warning\n`;
    mockProcess.stdout.emit('data', Buffer.from(lines));
    
    const buffer = stream.getBuffer();
    const resultLines = buffer.split('\n');
    expect(resultLines.length).toBe(2);
    expect(resultLines[0]).toContain('com.test.app started');
    expect(resultLines[1]).toContain('com.test.app warning');
  });
});

describe('Grounding SEK and Diff QA', () => {
  it('should handle SEK collisions via structural path hash properly', () => {
    const root: RawNode = {
      className: 'android.widget.FrameLayout', resourceId: '', text: '', contentDesc: '', packageName: '', bounds: [0,0,0,0], clickable: false, focusable: false, scrollable: false, enabled: true, children: []
    };
    const child1: RawNode = {
      className: 'android.widget.TextView', resourceId: '', text: '', contentDesc: '', packageName: '', bounds: [0,0,0,0], clickable: false, focusable: false, scrollable: false, enabled: true, children: []
    };
    const child2: RawNode = {
      className: 'android.widget.TextView', resourceId: '', text: '', contentDesc: '', packageName: '', bounds: [0,0,0,0], clickable: false, focusable: false, scrollable: false, enabled: true, children: []
    };
    root.children.push(child1, child2);

    const sek1 = generateSEK(child1, [root, child1]);
    const sek2 = generateSEK(child2, [root, child2]);
    
    expect(sek1).not.toBe(sek2);
    expect(sek1).toContain('path:');
  });

  it('should compute UIDiff correctly for mutations and salient changes', () => {
    const beforeMap = new Map();
    beforeMap.set('id:btn1', { sek: 'id:btn1', role: 'button', label: 'Submit', state: { enabled: true, focused: false } });
    beforeMap.set('id:text1', { sek: 'id:text1', role: 'text', label: 'Hello', state: { enabled: true, focused: false } });
    
    const before: TreeSnapshot = {
      timestamp: 0,
      screenScope: 'main',
      nodes: beforeMap
    };

    const afterMap = new Map();
    afterMap.set('id:btn1', { sek: 'id:btn1', role: 'button', label: 'Loading', state: { enabled: false, focused: false } }); // mutated
    afterMap.set('id:error1', { sek: 'id:error1', role: 'text', label: 'Network Error', state: { enabled: true, focused: false } }); // added, salient
    
    const after: TreeSnapshot = {
      timestamp: 1,
      screenScope: 'main',
      nodes: afterMap
    };

    const diff = computeUIDiff(before, after, { name: 'click', target: 'id:btn1' });
    
    expect(diff.outcome).toBe('ERROR_STATE');
    expect(diff.modified.length).toBe(2);
    expect(diff.modified[0].field).toBe('text'); // "Submit" -> "Loading" gets picked up, or enabled gets picked up. Wait, computeUIDiff checks multiple
    expect(diff.modified.some(m => m.field === 'enabled')).toBe(true);
    expect(diff.salientChange?.sek).toBe('id:error1');
    expect(diff.removed.length).toBe(1);
    expect(diff.removed[0].sek).toBe('id:text1');
  });
});
