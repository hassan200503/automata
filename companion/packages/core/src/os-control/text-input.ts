/**
 * Text input tools: type text, send key combinations, clipboard operations.
 * Uses PowerShell SendKeys on Windows.
 */

import { spawn } from 'node:child_process';
import { z } from 'zod';
import type { ToolDefinition } from '../tools/contracts.js';
import { readClipboard, writeClipboard, clearClipboard } from './clipboard-native.js';

function runPowerShell(script: string, signal?: AbortSignal, timeoutMs = 10_000): Promise<{ stdout: string; stderr: string; code: number }> {
  if (signal?.aborted) return Promise.resolve({ stdout: '', stderr: 'aborted', code: -1 });
  return new Promise((resolve) => {
    const child = spawn('powershell', ['-NoProfile', '-Command', script], { windowsHide: true });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (result: { stdout: string; stderr: string; code: number }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve(result);
    };
    const onAbort = () => {
      try { child.kill(); } catch { /* ignore */ }
      finish({ stdout, stderr: stderr + '\n[aborted]', code: -1 });
    };
    const timer = setTimeout(() => {
      try { child.kill(); } catch { /* ignore */ }
      finish({ stdout, stderr: stderr + '\n[timed out]', code: -1 });
    }, timeoutMs);
    signal?.addEventListener('abort', onAbort, { once: true });
    child.stdout?.on('data', (d) => { stdout += String(d); });
    child.stderr?.on('data', (d) => { stderr += String(d); });
    child.on('error', (e) => finish({ stdout, stderr: stderr + '\n' + String(e), code: -1 }));
    child.on('close', (code) => finish({ stdout, stderr, code: code ?? 0 }));
  });
}

function escapeSendKeys(s: string): string {
  return s.split('').map((c) => {
    if ('+^%~(){}[]'.includes(c)) return `{${c}}`;
    return c;
  }).join('');
}

// ── Type text into active window ────────────────────────────────────

export async function typeText(text: string, signal?: AbortSignal): Promise<{ typed: boolean; error?: string }> {
  if (!text) return { typed: false, error: 'empty_text' };
  const escaped = escapeSendKeys(text);
  const script = [
    '$wsh = New-Object -ComObject WScript.Shell',
    'Start-Sleep -Milliseconds 200',
    `$wsh.SendKeys("${escaped}")`,
    'Write-Output "typed"',
  ].join('; ');
  const result = await runPowerShell(script, signal);
  if (result.stdout.includes('typed')) return { typed: true };
  return { typed: false, error: result.stderr.trim() || `exit ${result.code}` };
}

// ── Send key combinations ───────────────────────────────────────────

const KEY_MAP: Record<string, string> = {
  'ctrl+c': '^c',
  'ctrl+v': '^v',
  'ctrl+x': '^x',
  'ctrl+a': '^a',
  'ctrl+z': '^z',
  'ctrl+y': '^y',
  'ctrl+s': '^s',
  'ctrl+p': '^p',
  'ctrl+f': '^f',
  'ctrl+w': '^w',
  'ctrl+n': '^n',
  'ctrl+t': '^t',
  'ctrl+shift+t': '^+t',
  'alt+tab': '%{TAB}',
  'alt+f4': '%{F4}',
  'ctrl+alt+del': '^(%{DEL})', // May not work via SendKeys for security reasons
  'enter': '{ENTER}',
  'escape': '{ESC}',
  'tab': '{TAB}',
  'backspace': '{BACKSPACE}',
  'delete': '{DELETE}',
  'home': '{HOME}',
  'end': '{END}',
  'page_up': '{PGUP}',
  'page_down': '{PGDN}',
  'up': '{UP}',
  'down': '{DOWN}',
  'left': '{LEFT}',
  'right': '{RIGHT}',
  'f1': '{F1}',
  'f2': '{F2}',
  'f5': '{F5}',
  'f11': '{F11}',
  'f12': '{F12}',
  'space': ' ',
};

export async function sendKeys(keys: string, signal?: AbortSignal): Promise<{ sent: boolean; keys: string; error?: string }> {
  const normalized = keys.toLowerCase().trim();
  const mapped = KEY_MAP[normalized];
  if (!mapped) return { sent: false, keys, error: 'unknown_key_combo' };
  const script = [
    '$wsh = New-Object -ComObject WScript.Shell',
    'Start-Sleep -Milliseconds 100',
    `$wsh.SendKeys("${mapped}")`,
    'Write-Output "sent"',
  ].join('; ');
  const result = await runPowerShell(script, signal);
  if (result.stdout.includes('sent')) return { sent: true, keys };
  return { sent: false, keys, error: result.stderr.trim() || `exit ${result.code}` };
}

// ── Tool Definitions ───────────────────────────────────────────────

export function createOsTypeTextTool(): ToolDefinition<{ text: string }, { typed: boolean; error?: string }> {
  return {
    name: 'os.typeText',
    version: '1.0.0',
    description: 'Type text into the currently active window via SendKeys.',
    inputSchema: z.object({ text: z.string().min(1).max(5000) }),
    outputSchema: z.object({ typed: z.boolean(), error: z.string().optional() }),
    requiredPermissions: ['os.exec'],
    dataClassification: 'personal',
    riskClass: 2,
    reversible: false,
    timeoutMs: 15_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx, input) => typeText(input.text, ctx.signal),
  };
}

export function createOsSendKeysTool(): ToolDefinition<{ keys: string }, { sent: boolean; keys: string; error?: string }> {
  return {
    name: 'os.sendKeys',
    version: '1.0.0',
    description: 'Send a key combination (e.g. ctrl+c, alt+tab, enter, escape, f5). See docs for full key list.',
    inputSchema: z.object({
      keys: z.enum([
        'ctrl+c', 'ctrl+v', 'ctrl+x', 'ctrl+a', 'ctrl+z', 'ctrl+y', 'ctrl+s', 'ctrl+p',
        'ctrl+f', 'ctrl+w', 'ctrl+n', 'ctrl+t', 'ctrl+shift+t',
        'alt+tab', 'alt+f4',
        'enter', 'escape', 'tab', 'backspace', 'delete', 'home', 'end',
        'page_up', 'page_down', 'up', 'down', 'left', 'right',
        'f1', 'f2', 'f5', 'f11', 'f12', 'space',
      ]),
    }),
    outputSchema: z.object({ sent: z.boolean(), keys: z.string(), error: z.string().optional() }),
    requiredPermissions: ['os.exec'],
    dataClassification: 'personal',
    riskClass: 2,
    reversible: false,
    timeoutMs: 10_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx, input) => sendKeys(input.keys, ctx.signal),
  };
}

export function createOsClipboardReadTool(): ToolDefinition<Record<string, never>, { ok: boolean; text: string; error?: string }> {
  return {
    name: 'os.clipboardRead',
    version: '1.0.0',
    description: 'Read the current text content of the clipboard.',
    inputSchema: z.object({}),
    outputSchema: z.object({ ok: z.boolean(), text: z.string(), error: z.string().optional() }),
    requiredPermissions: ['os.open'],
    dataClassification: 'personal',
    riskClass: 1,
    reversible: true,
    timeoutMs: 5_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx) => {
      const text = await readClipboard(ctx.signal);
      return { ok: true, text };
    },
  };
}

export function createOsClipboardWriteTool(): ToolDefinition<{ text: string }, { ok: boolean; error?: string }> {
  return {
    name: 'os.clipboardWrite',
    version: '1.0.0',
    description: 'Write text to the clipboard.',
    inputSchema: z.object({ text: z.string().min(1).max(50000) }),
    outputSchema: z.object({ ok: z.boolean(), error: z.string().optional() }),
    requiredPermissions: ['os.open'],
    dataClassification: 'personal',
    riskClass: 1,
    reversible: true,
    timeoutMs: 5_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx, input) => {
      await writeClipboard(input.text, ctx.signal);
      return { ok: true };
    },
  };
}

export function createOsClipboardClearTool(): ToolDefinition<Record<string, never>, { ok: boolean; error?: string }> {
  return {
    name: 'os.clipboardClear',
    version: '1.0.0',
    description: 'Clear the clipboard contents.',
    inputSchema: z.object({}),
    outputSchema: z.object({ ok: z.boolean(), error: z.string().optional() }),
    requiredPermissions: ['os.open'],
    dataClassification: 'personal',
    riskClass: 1,
    reversible: true,
    timeoutMs: 5_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx) => {
      await clearClipboard(ctx.signal);
      return { ok: true };
    },
  };
}

export function createTextInputTools(): ToolDefinition<unknown, unknown>[] {
  return [
    createOsTypeTextTool() as ToolDefinition<unknown, unknown>,
    createOsSendKeysTool() as ToolDefinition<unknown, unknown>,
    createOsClipboardReadTool() as ToolDefinition<unknown, unknown>,
    createOsClipboardWriteTool() as ToolDefinition<unknown, unknown>,
    createOsClipboardClearTool() as ToolDefinition<unknown, unknown>,
  ];
}
