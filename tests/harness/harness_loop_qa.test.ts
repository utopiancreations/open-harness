import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeUiAction } from '../../src/core/tools/registry.js';
import { uiTapTool } from '../../src/core/tools/ui_tap.js';
import { uiTypeTool } from '../../src/core/tools/ui_type.js';
import { uiDumpTool } from '../../src/core/tools/ui_dump.js';
import { TranscriptLogger } from '../../src/core/harness/transcript.js';
import { HarnessLoop } from '../../src/core/harness/loop.js';
import { ActionHistory } from '../../src/core/grounding/loop_detector.js';
import fs from 'node:fs';
import path from 'node:path';

// Mock dependencies
vi.mock('../../src/core/grounding/diff.js', () => ({
  computeUIDiff: vi.fn().mockReturnValue({ outcome: 'success' })
}));

describe('Harness Loop & Tools QA', () => {

  describe('registry.ts (executeUiAction)', () => {
    let mockHeartbeat: any;
    let mockActionHistory: any;
    let mockCtx: any;

    beforeEach(() => {
      mockHeartbeat = {
        waitForStable: vi.fn()
      };
      mockActionHistory = {
        record: vi.fn(),
        detectLoop: vi.fn().mockReturnValue(null)
      };
      mockCtx = {
        heartbeat: mockHeartbeat,
        actionHistory: mockActionHistory,
        adbTap: vi.fn(),
        adbType: vi.fn(),
        adbSwipe: vi.fn(),
        resolveElement: vi.fn()
      };
    });

    it('handles pre-heartbeat DEVICE_ERROR', async () => {
      mockHeartbeat.waitForStable.mockResolvedValueOnce({ status: 'DEVICE_ERROR', error: 'Connection lost' });
      const result = await executeUiAction('test', 'sek1', vi.fn(), mockCtx);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Connection lost');
    });

    it('handles pre-heartbeat TIMEOUT', async () => {
      const mockSnapshot = { nodes: new Map() };
      mockHeartbeat.waitForStable
        .mockResolvedValueOnce({ status: 'TIMEOUT', lastSnapshot: mockSnapshot })
        .mockResolvedValueOnce({ status: 'STABLE', snapshot: mockSnapshot, elapsedMs: 100 });
      const result = await executeUiAction('test', 'sek1', vi.fn(), mockCtx);
      expect(result.ok).toBe(true);
      expect(result.systemMessages.some(m => m.toLowerCase().includes('pre-action snapshot is untrusted'))).toBe(true);
    });

    it('captures action execution exception gracefully', async () => {
      mockHeartbeat.waitForStable.mockResolvedValueOnce({ status: 'STABLE', snapshot: { nodes: new Map() } });
      const failingExecute = vi.fn().mockRejectedValue(new Error('Crash'));
      const result = await executeUiAction('test', 'sek1', failingExecute, mockCtx);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Action execution failed: Crash');
    });

    it('post-heartbeat TIMEOUT adds system messages', async () => {
      const mockSnapshot = { nodes: new Map() };
      mockHeartbeat.waitForStable
        .mockResolvedValueOnce({ status: 'STABLE', snapshot: mockSnapshot })
        .mockResolvedValueOnce({ status: 'TIMEOUT', lastSnapshot: mockSnapshot, elapsedMs: 100 });
      const result = await executeUiAction('test', 'sek1', vi.fn().mockResolvedValue(undefined), mockCtx);
      expect(result.ok).toBe(true);
      expect(result.systemMessages).toContainEqual(expect.stringContaining('did not stabilize'));
    });

    it('loop detection triggers warnings when identical action repeated 3x', async () => {
      const mockSnapshot = { nodes: new Map() };
      mockHeartbeat.waitForStable.mockResolvedValue({ status: 'STABLE', snapshot: mockSnapshot, elapsedMs: 10 });
      mockActionHistory.detectLoop.mockReturnValue({ message: 'Warning: Loop detected' });
      
      const result = await executeUiAction('test', 'sek1', vi.fn(), mockCtx);
      expect(result.loopSignal).toEqual({ message: 'Warning: Loop detected' });
      expect(result.systemMessages).toContainEqual('Warning: Loop detected');
    });
  });

  describe('ui_tap.ts and ui_type.ts', () => {
    let mockCtx: any;

    beforeEach(() => {
      mockCtx = {
        heartbeat: {
          waitForStable: vi.fn()
        },
        actionHistory: {
          record: vi.fn(),
          detectLoop: vi.fn()
        },
        adbTap: vi.fn(),
        adbType: vi.fn()
      };
    });

    it('uiTapTool tapping missing elements throws element not found with available SEKs', async () => {
      const mockSnapshot = { nodes: new Map([['sek2', {}], ['sek3', {}]]) };
      mockCtx.heartbeat.waitForStable.mockResolvedValue({ status: 'STABLE', snapshot: mockSnapshot });
      const result = await uiTapTool('sek1', mockCtx);
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/Element not found: "sek1"/);
      expect(result.error).toMatch(/sek2, sek3/);
    });

    it('uiTapTool tapping disabled elements throws descriptive error', async () => {
      const node = { state: { enabled: false }, bounds: [0,0,10,10] };
      const mockSnapshot = { nodes: new Map([['sek1', node]]) };
      mockCtx.heartbeat.waitForStable.mockResolvedValue({ status: 'STABLE', snapshot: mockSnapshot });
      const result = await uiTapTool('sek1', mockCtx);
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/is disabled/);
    });

    it('uiTypeTool typing into non-input role elements throws role error', async () => {
      const node = { role: 'button', bounds: [0,0,10,10] };
      const mockSnapshot = { nodes: new Map([['sek1', node]]) };
      mockCtx.heartbeat.waitForStable.mockResolvedValue({ status: 'STABLE', snapshot: mockSnapshot });
      const result = await uiTypeTool('sek1', 'hello', false, mockCtx);
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/is not a text input/);
    });
  });

  describe('transcript.ts', () => {
    it('file creation, append logic, structured JSON format validation', () => {
      const tmpDir = path.join(__dirname, 'tmp_transcript');
      if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
      
      const logger = new TranscriptLogger(tmpDir);
      const file = logger.getPath();
      expect(fs.existsSync(file)).toBe(true);

      logger.logSystemMessage('Hello system');
      logger.logModelAction({ name: 'tap', target: 'sek1' }, undefined, [], []);

      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(2);

      const turn0 = JSON.parse(lines[0]);
      expect(turn0.source).toBe('SYSTEM');
      expect(turn0.systemMessages).toContain('Hello system');
      expect(turn0.index).toBe(0);

      const turn1 = JSON.parse(lines[1]);
      expect(turn1.source).toBe('MODEL');
      expect(turn1.action.name).toBe('tap');
      expect(turn1.index).toBe(1);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });

  describe('HarnessLoop multi-turn mock execution', () => {
    it('runs loop and asserts full turn progression', async () => {
      const tmpDir = path.join(__dirname, 'tmp_loop');
      if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });

      vi.mock('../../src/core/llm/client.js', () => {
        let callCount = 0;
        return {
          LocalLlmClient: vi.fn().mockImplementation(() => {
            return {
              generateResponse: vi.fn().mockImplementation((messages: any[]) => {
                const fullText = messages.map((m: any) => m.content).join("\n");
                if (fullText.includes("Project Manager") || fullText.includes("Cybersecurity Manager") || fullText.includes("Product Designer") || fullText.includes("Synthesize all findings")) {
                  return { role: "assistant", content: "# Master Plan\n- [ ] Do the thing" };
                }

                const mockResponses = [
                  { tool_calls: [{ id: 'tc1', function: { name: 'ui_dump', arguments: '{}' } }] },
                  { tool_calls: [{ id: 'tc2', function: { name: 'ui_tap', arguments: '{"element_key": "sek1"}' } }] },
                  { tool_calls: [{ id: 'tc3', function: { name: 'ui_type', arguments: '{"element_key": "sek2", "text": "test"}' } }] },
                  { content: 'Task complete! Goal achieved.' }
                ];
                return mockResponses[callCount++];
              })
            };
          })
        };
      });

      // Reload module to pick up mocked llm client
      const { HarnessLoop } = await import('../../src/core/harness/loop.js');

      const mockProbe = { 
        fast: vi.fn().mockResolvedValue({ status: 'STABLE', snapshot: { nodes: new Map([['sek1', { state: { enabled: true }, bounds: [0,0,10,10] }], ['sek2', { role: 'text_input', state: { enabled: true }, bounds: [0,0,10,10] }]]), rootSEKs: [] } }),
        full: vi.fn().mockResolvedValue({ status: 'STABLE', snapshot: { nodes: new Map([['sek1', { state: { enabled: true }, bounds: [0,0,10,10] }], ['sek2', { role: 'text_input', state: { enabled: true }, bounds: [0,0,10,10] }]]), rootSEKs: [] } }),
        slow: vi.fn().mockResolvedValue({ status: 'STABLE', snapshot: { nodes: new Map([['sek1', { state: { enabled: true }, bounds: [0,0,10,10] }], ['sek2', { role: 'text_input', state: { enabled: true }, bounds: [0,0,10,10] }]]), rootSEKs: [] } })
      };
      const config = {
        model: { provider: 'test', model: 'test' },
        probe: mockProbe,
        adbTap: vi.fn(),
        adbType: vi.fn(),
        adbSwipe: vi.fn(),
        outputDir: tmpDir
      };

      const loop = new HarnessLoop(config);
      const result = await loop.run('Do the thing');

      if (!result.success) {
        console.error('HarnessLoop termination:', result.terminationReason);
        console.error('HarnessLoop turns:', result.turns);
      }
      expect(result.success).toBe(true);
      expect(result.terminationReason).toBe('goal_achieved');
      expect(result.totalSteps).toBeGreaterThanOrEqual(4);

      const content = fs.readFileSync(path.join(tmpDir, 'transcript.jsonl'), 'utf-8');
      const lines = content.trim().split('\n');
      // Should have plan turn, dump, tap, type, and final text
      expect(lines.length).toBeGreaterThanOrEqual(4);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });

});
