import { describe, expect, it } from 'vitest';
import { createWindowControlTools, createOsCloseAppTool, createOsSwitchAppTool, createOsMinimizeTool, createOsMaximizeTool, createOsListProcessesTool, createOsKillProcessTool, createOsMoveWindowTool, createOsResizeWindowTool } from './window-control.js';

describe('window-control tools', () => {
  describe('createWindowControlTools', () => {
    it('returns all 8 tools', () => {
      const tools = createWindowControlTools();
      expect(tools).toHaveLength(8);
      const names = tools.map((t) => t.name);
      expect(names).toEqual([
        'os.closeApp',
        'os.switchApp',
        'os.minimize',
        'os.maximize',
        'os.listProcesses',
        'os.killProcess',
        'os.moveWindow',
        'os.resizeWindow',
      ]);
    });
  });

  describe('os.moveWindow tool', () => {
    it('has correct metadata', () => {
      const tool = createOsMoveWindowTool();
      expect(tool.name).toBe('os.moveWindow');
      expect(tool.riskClass).toBe(1);
      expect(tool.requiredPermissions).toEqual(['os.open']);
    });

    it('validates coordinates', () => {
      const tool = createOsMoveWindowTool();
      expect(tool.inputSchema.safeParse({ x: 100, y: 200 }).success).toBe(true);
      expect(tool.inputSchema.safeParse({ x: -50, y: 0 }).success).toBe(true);
      expect(tool.inputSchema.safeParse({ x: 100001, y: 0 }).success).toBe(false);
      expect(tool.inputSchema.safeParse({ x: 1.5, y: 0 }).success).toBe(false);
      expect(tool.inputSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('os.resizeWindow tool', () => {
    it('has correct metadata', () => {
      const tool = createOsResizeWindowTool();
      expect(tool.name).toBe('os.resizeWindow');
      expect(tool.riskClass).toBe(1);
      expect(tool.requiredPermissions).toEqual(['os.open']);
    });

    it('validates dimensions', () => {
      const tool = createOsResizeWindowTool();
      expect(tool.inputSchema.safeParse({ width: 1280, height: 720 }).success).toBe(true);
      expect(tool.inputSchema.safeParse({ width: 49, height: 720 }).success).toBe(false);
      expect(tool.inputSchema.safeParse({ width: 1280 }).success).toBe(false);
    });
  });

  describe('os.closeApp tool', () => {
    it('has correct metadata', () => {
      const tool = createOsCloseAppTool();
      expect(tool.name).toBe('os.closeApp');
      expect(tool.riskClass).toBe(2);
      expect(tool.requiredPermissions).toEqual(['os.exec']);
      expect(tool.reversible).toBe(false);
    });

    it('validates non-empty process name', () => {
      const tool = createOsCloseAppTool();
      expect(tool.inputSchema.safeParse({ process: 'notepad' }).success).toBe(true);
      expect(tool.inputSchema.safeParse({ process: '' }).success).toBe(false);
    });
  });

  describe('os.switchApp tool', () => {
    it('has correct metadata', () => {
      const tool = createOsSwitchAppTool();
      expect(tool.name).toBe('os.switchApp');
      expect(tool.riskClass).toBe(1);
      expect(tool.requiredPermissions).toEqual(['os.open']);
      expect(tool.reversible).toBe(true);
    });

    it('validates non-empty process name', () => {
      const tool = createOsSwitchAppTool();
      expect(tool.inputSchema.safeParse({ process: 'chrome' }).success).toBe(true);
      expect(tool.inputSchema.safeParse({ process: '' }).success).toBe(false);
    });
  });

  describe('os.minimize tool', () => {
    it('has correct metadata', () => {
      const tool = createOsMinimizeTool();
      expect(tool.name).toBe('os.minimize');
      expect(tool.riskClass).toBe(1);
      expect(tool.reversible).toBe(true);
    });
  });

  describe('os.maximize tool', () => {
    it('has correct metadata', () => {
      const tool = createOsMaximizeTool();
      expect(tool.name).toBe('os.maximize');
      expect(tool.riskClass).toBe(1);
    });
  });

  describe('os.listProcesses tool', () => {
    it('has correct metadata', () => {
      const tool = createOsListProcessesTool();
      expect(tool.name).toBe('os.listProcesses');
      expect(tool.riskClass).toBe(1);
      expect(tool.requiredPermissions).toEqual(['os.open']);
    });

    it('output schema includes processes array', () => {
      const tool = createOsListProcessesTool();
      const parsed = tool.outputSchema.safeParse({
        ok: true,
        processes: [{ name: 'test.exe', pid: 1234, memoryMB: 50 }],
      });
      expect(parsed.success).toBe(true);
    });
  });

  describe('os.killProcess tool', () => {
    it('has correct metadata', () => {
      const tool = createOsKillProcessTool();
      expect(tool.name).toBe('os.killProcess');
      expect(tool.riskClass).toBe(3);
      expect(tool.requiresConfirmation).toBe(true);
      expect(tool.reversible).toBe(false);
      expect(tool.audit).toBe('full');
      expect(tool.requiredPermissions).toEqual(['os.exec']);
    });

    it('validates non-empty target', () => {
      const tool = createOsKillProcessTool();
      expect(tool.inputSchema.safeParse({ target: '1234' }).success).toBe(true);
      expect(tool.inputSchema.safeParse({ target: 'notepad' }).success).toBe(true);
      expect(tool.inputSchema.safeParse({ target: '' }).success).toBe(false);
    });
  });
});
