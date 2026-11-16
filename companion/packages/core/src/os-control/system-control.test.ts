import { describe, expect, it } from 'vitest';
import { createSystemControlTools, createOsVolumeTool, createOsMuteTool, createOsMediaKeyTool, createOsBrightnessTool, createOsLockScreenTool, createOsSleepTool } from './system-control.js';

describe('system-control tools', () => {
  describe('createSystemControlTools', () => {
    it('returns all 6 tools', () => {
      const tools = createSystemControlTools();
      expect(tools).toHaveLength(6);
      const names = tools.map((t) => t.name);
      expect(names).toEqual([
        'os.volume',
        'os.mute',
        'os.mediaKey',
        'os.brightness',
        'os.lockScreen',
        'os.sleep',
      ]);
    });
  });

  describe('os.volume tool', () => {
    it('has correct metadata', () => {
      const tool = createOsVolumeTool();
      expect(tool.name).toBe('os.volume');
      expect(tool.riskClass).toBe(1);
      expect(tool.requiredPermissions).toEqual(['os.media']);
      expect(tool.reversible).toBe(true);
      expect(tool.cancellable).toBe(true);
    });

    it('validates input schema (0-100 integer)', () => {
      const tool = createOsVolumeTool();
      expect(tool.inputSchema.safeParse({ level: 50 }).success).toBe(true);
      expect(tool.inputSchema.safeParse({ level: 0 }).success).toBe(true);
      expect(tool.inputSchema.safeParse({ level: 100 }).success).toBe(true);
      expect(tool.inputSchema.safeParse({ level: -1 }).success).toBe(false);
      expect(tool.inputSchema.safeParse({ level: 101 }).success).toBe(false);
      expect(tool.inputSchema.safeParse({ level: 50.5 }).success).toBe(false);
    });
  });

  describe('os.mute tool', () => {
    it('has correct metadata', () => {
      const tool = createOsMuteTool();
      expect(tool.name).toBe('os.mute');
      expect(tool.riskClass).toBe(1);
      expect(tool.requiredPermissions).toEqual(['os.media']);
    });

    it('validates boolean input', () => {
      const tool = createOsMuteTool();
      expect(tool.inputSchema.safeParse({ mute: true }).success).toBe(true);
      expect(tool.inputSchema.safeParse({ mute: false }).success).toBe(true);
      expect(tool.inputSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('os.mediaKey tool', () => {
    it('has correct metadata', () => {
      const tool = createOsMediaKeyTool();
      expect(tool.name).toBe('os.mediaKey');
      expect(tool.riskClass).toBe(1);
    });

    it('accepts valid media keys', () => {
      const tool = createOsMediaKeyTool();
      const validKeys = ['play_pause', 'next_track', 'prev_track', 'stop', 'volume_up', 'volume_down', 'volume_mute'];
      for (const key of validKeys) {
        expect(tool.inputSchema.safeParse({ key }).success).toBe(true);
      }
    });

    it('rejects unknown media keys', () => {
      const tool = createOsMediaKeyTool();
      expect(tool.inputSchema.safeParse({ key: 'fast_forward' }).success).toBe(false);
      expect(tool.inputSchema.safeParse({ key: '' }).success).toBe(false);
    });
  });

  describe('os.brightness tool', () => {
    it('has correct metadata', () => {
      const tool = createOsBrightnessTool();
      expect(tool.name).toBe('os.brightness');
      expect(tool.riskClass).toBe(1);
      expect(tool.requiredPermissions).toEqual(['os.media']);
    });

    it('validates input schema (0-100 integer)', () => {
      const tool = createOsBrightnessTool();
      expect(tool.inputSchema.safeParse({ level: 75 }).success).toBe(true);
      expect(tool.inputSchema.safeParse({ level: -1 }).success).toBe(false);
      expect(tool.inputSchema.safeParse({ level: 101 }).success).toBe(false);
    });
  });

  describe('os.lockScreen tool', () => {
    it('has correct metadata', () => {
      const tool = createOsLockScreenTool();
      expect(tool.name).toBe('os.lockScreen');
      expect(tool.riskClass).toBe(2);
      expect(tool.reversible).toBe(false);
      expect(tool.requiredPermissions).toEqual(['os.open']);
    });

    it('accepts empty input', () => {
      const tool = createOsLockScreenTool();
      expect(tool.inputSchema.safeParse({}).success).toBe(true);
    });
  });

  describe('os.sleep tool', () => {
    it('has correct metadata', () => {
      const tool = createOsSleepTool();
      expect(tool.name).toBe('os.sleep');
      expect(tool.riskClass).toBe(2);
      expect(tool.reversible).toBe(false);
      expect(tool.requiredPermissions).toEqual(['os.open']);
    });

    it('accepts empty input', () => {
      const tool = createOsSleepTool();
      expect(tool.inputSchema.safeParse({}).success).toBe(true);
    });
  });
});
