import { describe, expect, it } from 'vitest';
import { createTextInputTools, createOsTypeTextTool, createOsSendKeysTool, createOsClipboardReadTool, createOsClipboardWriteTool, createOsClipboardClearTool } from './text-input.js';

describe('text-input tools', () => {
  describe('createTextInputTools', () => {
    it('returns all 5 tools', () => {
      const tools = createTextInputTools();
      expect(tools).toHaveLength(5);
      const names = tools.map((t) => t.name);
      expect(names).toEqual([
        'os.typeText',
        'os.sendKeys',
        'os.clipboardRead',
        'os.clipboardWrite',
        'os.clipboardClear',
      ]);
    });
  });

  describe('os.typeText tool', () => {
    it('has correct metadata', () => {
      const tool = createOsTypeTextTool();
      expect(tool.name).toBe('os.typeText');
      expect(tool.riskClass).toBe(2);
      expect(tool.requiredPermissions).toEqual(['os.exec']);
      expect(tool.reversible).toBe(false);
    });

    it('validates text input (1-5000 chars)', () => {
      const tool = createOsTypeTextTool();
      expect(tool.inputSchema.safeParse({ text: 'Hello World' }).success).toBe(true);
      expect(tool.inputSchema.safeParse({ text: '' }).success).toBe(false);
      expect(tool.inputSchema.safeParse({ text: 'x'.repeat(5001) }).success).toBe(false);
    });
  });

  describe('os.sendKeys tool', () => {
    it('has correct metadata', () => {
      const tool = createOsSendKeysTool();
      expect(tool.name).toBe('os.sendKeys');
      expect(tool.riskClass).toBe(2);
      expect(tool.requiredPermissions).toEqual(['os.exec']);
    });

    it('accepts valid key combinations', () => {
      const tool = createOsSendKeysTool();
      const validKeys = [
        'ctrl+c', 'ctrl+v', 'ctrl+x', 'ctrl+a', 'ctrl+z', 'ctrl+y', 'ctrl+s',
        'ctrl+p', 'ctrl+f', 'ctrl+w', 'ctrl+n', 'ctrl+t', 'ctrl+shift+t',
        'alt+tab', 'alt+f4', 'enter', 'escape', 'tab', 'backspace', 'delete',
        'home', 'end', 'page_up', 'page_down', 'up', 'down', 'left', 'right',
        'f1', 'f2', 'f5', 'f11', 'f12', 'space',
      ];
      for (const keys of validKeys) {
        expect(tool.inputSchema.safeParse({ keys }).success).toBe(true);
      }
    });

    it('rejects unknown key combinations', () => {
      const tool = createOsSendKeysTool();
      expect(tool.inputSchema.safeParse({ keys: 'ctrl+q' }).success).toBe(false);
      expect(tool.inputSchema.safeParse({ keys: '' }).success).toBe(false);
    });
  });

  describe('os.clipboardRead tool', () => {
    it('has correct metadata', () => {
      const tool = createOsClipboardReadTool();
      expect(tool.name).toBe('os.clipboardRead');
      expect(tool.riskClass).toBe(1);
      expect(tool.requiredPermissions).toEqual(['os.open']);
      expect(tool.reversible).toBe(true);
    });

    it('accepts empty input', () => {
      const tool = createOsClipboardReadTool();
      expect(tool.inputSchema.safeParse({}).success).toBe(true);
    });
  });

  describe('os.clipboardWrite tool', () => {
    it('has correct metadata', () => {
      const tool = createOsClipboardWriteTool();
      expect(tool.name).toBe('os.clipboardWrite');
      expect(tool.riskClass).toBe(1);
    });

    it('validates text input (1-50000 chars)', () => {
      const tool = createOsClipboardWriteTool();
      expect(tool.inputSchema.safeParse({ text: 'clipboard content' }).success).toBe(true);
      expect(tool.inputSchema.safeParse({ text: '' }).success).toBe(false);
    });
  });

  describe('os.clipboardClear tool', () => {
    it('has correct metadata', () => {
      const tool = createOsClipboardClearTool();
      expect(tool.name).toBe('os.clipboardClear');
      expect(tool.riskClass).toBe(1);
    });

    it('accepts empty input', () => {
      const tool = createOsClipboardClearTool();
      expect(tool.inputSchema.safeParse({}).success).toBe(true);
    });
  });
});
