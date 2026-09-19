import { describe, it, expect } from 'vitest';
import { parseLogcat, extractCrashBlocks, filterLogcat } from '../../src/core/compactor/logcat_filter.js';
import { elideHistory, summarizeTurn, Turn } from '../../src/core/compactor/history_elide.js';
import { ContextCompactor, allocateBudget, Observation } from '../../src/core/compactor/index.js';
import { collapseTree, classifyGroundedNode, NodeTier } from '../../src/core/compactor/tree_collapse.js';
import { TreeSnapshot, GroundedNode, NodeState } from '../../src/core/grounding/types.js';

describe('logcat_filter.ts', () => {
  it('extracts multiline Android FATAL EXCEPTION crash blocks', () => {
    const rawLog = `
09-18 10:00:00.000  1234  1234 E AndroidRuntime: FATAL EXCEPTION: main
09-18 10:00:00.001  1234  1234 E AndroidRuntime: Process: com.example.app, PID: 1234
09-18 10:00:00.002  1234  1234 E AndroidRuntime: java.lang.RuntimeException: Test crash
09-18 10:00:00.003  1234  1234 E AndroidRuntime: \tat com.example.app.MainActivity.onCreate(MainActivity.java:10)
09-18 10:00:00.004  1234  1234 I SomeTag       : Unrelated log
    `.trim();

    const filtered = filterLogcat(rawLog, 'com.example.app');
    expect(filtered.crashes.length).toBe(1);
    expect(filtered.crashes[0].message).toContain('FATAL EXCEPTION: main');
    expect(filtered.crashes[0].message).toContain('java.lang.RuntimeException');
    expect(filtered.crashes[0].message).toContain('at com.example.app.MainActivity');
    expect(filtered.crashes[0].message).not.toContain('Unrelated log');
    expect(filtered.summary).toContain('FATAL EXCEPTION');
  });

  it('extracts FlutterError stack traces', () => {
    const rawLog = `
09-18 10:00:00.000  1234  1234 E flutter : ══╡ EXCEPTION CAUGHT BY WIDGETS LIBRARY ╞═══════════════════════════════════════════════════════════
09-18 10:00:00.001  1234  1234 E flutter : The following assertion was thrown building MyWidget(dirty):
09-18 10:00:00.002  1234  1234 E flutter : A non-null String must be provided to a Text widget.
    `.trim();

    const filtered = filterLogcat(rawLog, 'com.example.app');
    expect(filtered.flutterErrors.length).toBe(1);
    expect(filtered.flutterErrors[0].message).toContain('EXCEPTION CAUGHT BY WIDGETS LIBRARY');
    expect(filtered.flutterErrors[0].message).toContain('A non-null String must be provided');
    expect(filtered.summary).toContain('Flutter errors');
  });

  it('handles noisy system logs with zero crash traces (returns clean summary)', () => {
    const rawLog = `
09-18 10:00:00.000  1234  1234 I SystemUI: Normal info
09-18 10:00:00.001  1234  1234 D Network: Debug message
    `.trim();

    const filtered = filterLogcat(rawLog, 'com.example.app');
    expect(filtered.crashes.length).toBe(0);
    expect(filtered.flutterErrors.length).toBe(0);
    expect(filtered.summary).toBe('No errors or crashes in logcat.');
  });

  it('handles line truncation and line limit parameters', () => {
    const rawLog = `
09-18 10:00:00.000  1234  1234 E AndroidRuntime: FATAL EXCEPTION: main
09-18 10:00:00.001  1234  1234 E AndroidRuntime: java.lang.RuntimeException: A very long crash that exceeds the budget and needs to be truncated to fit the token limit
    `.trim();

    // Budget of 10 tokens = 40 characters
    const filtered = filterLogcat(rawLog, 'com.example.app', 10);
    expect(filtered.truncated).toBe(true);
    expect(filtered.summary.length).toBeLessThanOrEqual(40 + "\n...[TRUNCATED]".length);
    expect(filtered.summary).toContain('...[TRUNCATED]');
  });
});

describe('history_elide.ts', () => {
  const createTurn = (index: number, diffOutcome: any = "NO_CHANGE"): Turn => ({
    index,
    action: { name: 'click', target: 'btn' },
    diff: {
      action: 'click',
      targetSEK: 'btn',
      outcome: diffOutcome,
      confidence: 'high',
      summary: 'clicked',
      added: [], removed: [], modified: [],
      salientChange: { sek: 'btn', role: 'button', label: 'test' }
    },
    systemMessages: []
  });

  it('compresses past turns into 1-line summaries while preserving the most recent N turns verbatim', () => {
    const turns = [
      createTurn(0), createTurn(1, "MUTATED"), createTurn(2), 
      createTurn(3), createTurn(4), createTurn(5)
    ];

    const result = elideHistory(turns, 1000);
    expect(result.recentTurns.length).toBe(3); // Most recent 3 (3, 4, 5)
    expect(result.recentTurns[0].index).toBe(3);
    
    expect(result.summaryLines.length).toBe(3); // Older 3 (0, 1, 2)
    expect(result.summaryLines[0]).toContain('turn 0: click btn -> NO_CHANGE');
    expect(result.summaryLines[1]).toContain('turn 1: click btn -> MUTATED (btn)');
    expect(result.elidedCount).toBe(0);
  });

  it('calculates correct token usage estimates and elides correctly if budget is tight', () => {
    const turns = [
      createTurn(0), createTurn(1), createTurn(2), 
      createTurn(3), createTurn(4), createTurn(5)
    ];

    const recentTokens = Math.ceil(JSON.stringify(turns.slice(-3)).length / 4);
    const result = elideHistory(turns, recentTokens + 5); 
    
    expect(result.recentTurns.length).toBe(3);
    expect(result.summaryLines.length).toBeLessThan(3);
    expect(result.elidedCount).toBeGreaterThan(0);
  });
});

describe('compactor/index.ts (ContextCompactor)', () => {
  it('allocates budget correctly', () => {
    const budget = allocateBudget(10000, 1000, 1000, 1000);
    expect(budget.recentTurnsBudget).toBe(2800);
    expect(budget.summaryBudget).toBe(1400);
    expect(budget.currentObservationBudget).toBe(2800);
  });

  it('compacts turns and observations within specified token budgets', () => {
    const compactor = new ContextCompactor(allocateBudget(5000, 500, 500, 500));
    const prompt = compactor.buildPrompt('system', 'tools', [], {
      logcatRaw: '09-18 10:00:00.000 1234 1234 E AndroidRuntime: FATAL EXCEPTION: main\nProcess: com.app',
      packageName: 'com.app'
    });
    
    expect(prompt.system).toBe('system');
    expect(prompt.tools).toBe('tools');
    expect(prompt.collapsedObservation).toContain('LOGCAT');
    expect(prompt.collapsedObservation).toContain('FATAL EXCEPTION');
  });
});

describe('tree_collapse.ts', () => {
  const createNode = (sek: string, role: any, label: string, children: GroundedNode[] = []): GroundedNode => ({
    sek,
    role,
    label,
    state: { enabled: true, focused: false, selected: false, visible: true },
    bounds: [0, 0, 100, 100],
    children
  });

  it('handles deeply nested structures (15+ levels)', () => {
    let root = createNode('node-15', 'text', 'Leaf');
    for (let i = 14; i >= 0; i--) {
      root = createNode(`node-${i}`, 'scroll_container', '', [root]);
    }
    const snapshot: TreeSnapshot = {
      timestamp: 0,
      screenScope: 'app',
      nodes: new Map([['node-0', root]]),
      rootSEKs: ['node-0'],
      hash: 'abc'
    };

    const result = collapseTree(snapshot, 2000);
    expect(result.elidedCount).toBe(15); 
    expect(result.yaml).toContain('node-15');
    expect(result.yaml).toContain('15 structural nodes elided');
  });

  it('handles elements with special characters, empty text, null values, or huge bounds', () => {
    const node1 = createNode('n1', 'text', 'Special: \n\t"<>');
    const node2 = createNode('n2', 'text', '');
    const node3 = createNode('n3', 'button', 'Btn');
    node3.bounds = [-99999, -99999, 999999, 999999]; // Huge bounds
    
    const root = createNode('root', 'scroll_container', '', [node1, node2, node3]);
    
    const snapshot: TreeSnapshot = {
      timestamp: 0,
      screenScope: 'app',
      nodes: new Map([['root', root]]),
      rootSEKs: ['root'],
      hash: 'abc'
    };

    const result = collapseTree(snapshot, 2000);
    expect(result.yaml).toContain('Special: \\n\\t\\"<>');
    expect(result.yaml).toContain('n3'); 
    expect(result.yaml).not.toContain('n2'); 
    expect(result.elidedCount).toBe(2);
  });

  it('enforces budget truncation when tree exceeds token limit', () => {
    const children = [];
    for (let i = 0; i < 50; i++) {
      children.push(createNode(`btn-${i}`, 'button', `Button ${i}`));
    }
    const root = createNode('root', 'scroll_container', '', children);

    const snapshot: TreeSnapshot = {
      timestamp: 0,
      screenScope: 'app',
      nodes: new Map([['root', root]]),
      rootSEKs: ['root'],
      hash: 'abc'
    };

    const result = collapseTree(snapshot, 150);
    expect(result.truncated).toBe(true);
    expect(result.yaml).toContain('element list truncated to fit budget');
    const elementCount = result.yaml.split('\n').filter(l => l.includes('role: button')).length;
    expect(elementCount).toBe(10);
  });
});
