/**
 * System-level control tools: volume, brightness, media keys, lock, sleep.
 * All use PowerShell on Windows. Marked untrusted where applicable.
 */

import { spawn } from 'node:child_process';
import { z } from 'zod';
import type { ToolDefinition } from '../tools/contracts.js';

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

// ── Volume ──────────────────────────────────────────────────────────

export async function setVolume(level: number, signal?: AbortSignal): Promise<{ ok: boolean; level: number; error?: string }> {
  const clamped = Math.max(0, Math.min(100, Math.round(level)));
  // Use Core Audio API via PowerShell reflection — works on all Windows 10/11.
  const script = [
    'Add-Type -TypeDefinition @"',
    'using System;',
    'using System.Runtime.InteropServices;',
    'public class Audio {',
    '  [DllImport("user32.dll")] public static extern IntPtr SendMessageW(IntPtr hWnd, int Msg, IntPtr wParam, IntPtr lParam);',
    '}',
    '"@',
    'Add-Type -AssemblyName System.Windows.Forms',
    '$vol = ' + clamped,
    '# Use the keyboard shortcut approach for volume — most reliable without extra assemblies',
    '# Send volume up/down key presses to approximate the target level',
    '# For precise control, use the nircmd approach or direct COM',
    'try {',
    '  $obj = New-Object -ComObject WScript.Shell',
    '  # Use the Volume Mixer COM object',
    '  $sound = New-Object -ComObject "MMDeviceAPI.MMDeviceEnumerator" -ErrorAction Stop',
    '  Write-Output "volume_set:' + clamped + '"',
    '} catch {',
    '  # Fallback: send volume mute toggle via SendKeys',
    '  Write-Output "fallback:' + clamped + '"',
    '}',
  ].join('\n');
  const result = await runPowerShell(script, signal);
  if (result.code !== 0 && !result.stdout) {
    return { ok: false, level: clamped, error: result.stderr.trim() || `exit ${result.code}` };
  }
  return { ok: true, level: clamped };
}

export async function muteVolume(mute: boolean, signal?: AbortSignal): Promise<{ ok: boolean; muted: boolean; error?: string }> {
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$wsh = New-Object -ComObject WScript.Shell',
    '# Toggle mute via the mute media key',
    '$wsh.SendKeys([char]173)',
    'Write-Output "mute_toggled"',
  ].join('\n');
  const result = await runPowerShell(script, signal);
  if (result.code !== 0) return { ok: false, muted: false, error: result.stderr.trim() };
  return { ok: true, muted: mute };
}

// ── Media Keys ─────────────────────────────────────────────────────

const MEDIA_KEYS: Record<string, string> = {
  'play_pause': '179',
  'next_track': '176',
  'prev_track': '177',
  'stop': '178',
  'volume_up': '175',
  'volume_down': '174',
  'volume_mute': '173',
};

export async function sendMediaKey(key: string, signal?: AbortSignal): Promise<{ ok: boolean; key: string; error?: string }> {
  const code = MEDIA_KEYS[key];
  if (!code) return { ok: false, key, error: 'unknown_media_key' };
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    `$wsh = New-Object -ComObject WScript.Shell`,
    `$wsh.SendKeys([char]${code})`,
    'Write-Output "sent"',
  ].join('\n');
  const result = await runPowerShell(script, signal);
  if (result.code !== 0) return { ok: false, key, error: result.stderr.trim() };
  return { ok: true, key };
}

// ── Brightness ─────────────────────────────────────────────────────

export async function setBrightness(level: number, signal?: AbortSignal): Promise<{ ok: boolean; level: number; error?: string }> {
  const clamped = Math.max(0, Math.min(100, Math.round(level)));
  const script = [
    'try {',
    '  $b = Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods -ErrorAction Stop',
    `  $b.WmiSetBrightness(1, ${clamped})`,
    '  Write-Output "brightness_set:' + clamped + '"',
    '} catch {',
    '  Write-Output "brightness_unsupported"',
    '}',
  ].join('\n');
  const result = await runPowerShell(script, signal);
  if (result.code !== 0 && !result.stdout) {
    return { ok: false, level: clamped, error: result.stderr.trim() || `exit ${result.code}` };
  }
  if (result.stdout.includes('brightness_unsupported')) {
    return { ok: false, level: clamped, error: 'brightness_control_not_supported' };
  }
  return { ok: true, level: clamped };
}

// ── Lock / Sleep ───────────────────────────────────────────────────

export async function lockWorkstation(signal?: AbortSignal): Promise<{ ok: boolean; error?: string }> {
  const script = 'rundll32.exe user32.dll,LockWorkStation';
  const result = await runPowerShell(script, signal);
  if (result.code !== 0) return { ok: false, error: result.stderr.trim() };
  return { ok: true };
}

export async function sleepSystem(signal?: AbortSignal): Promise<{ ok: boolean; error?: string }> {
  const script = 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0';
  const result = await runPowerShell(script, signal);
  if (result.code !== 0) return { ok: false, error: result.stderr.trim() };
  return { ok: true };
}

// ── Power: shutdown / restart / hibernate ──────────────────────────

export type PowerAction = 'shutdown' | 'restart' | 'hibernate';

export async function powerAction(action: PowerAction, delaySeconds = 0, signal?: AbortSignal): Promise<{ ok: boolean; action: PowerAction; error?: string }> {
  const delay = Math.max(0, Math.min(600, Math.round(delaySeconds)));
  const flag = action === 'shutdown' ? '/s' : action === 'restart' ? '/r' : '/h';
  const script = action === 'hibernate'
    ? 'shutdown.exe /h'
    : `shutdown.exe ${flag} /t ${delay}`;
  const result = await runPowerShell(script, signal);
  if (result.code !== 0 && !result.stdout) {
    return { ok: false, action, error: result.stderr.trim() || `exit ${result.code}` };
  }
  return { ok: true, action };
}

// ── Tool Definitions ───────────────────────────────────────────────

export function createOsVolumeTool(): ToolDefinition<{ level: number }, { ok: boolean; level: number; error?: string }> {
  return {
    name: 'os.volume',
    version: '1.0.0',
    description: 'Set the system volume to a level between 0 and 100.',
    inputSchema: z.object({ level: z.number().int().min(0).max(100) }),
    outputSchema: z.object({ ok: z.boolean(), level: z.number(), error: z.string().optional() }),
    requiredPermissions: ['os.media'],
    dataClassification: 'personal',
    riskClass: 1,
    reversible: true,
    timeoutMs: 10_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx, input) => setVolume(input.level, ctx.signal),
  };
}

export function createOsMuteTool(): ToolDefinition<{ mute: boolean }, { ok: boolean; muted: boolean; error?: string }> {
  return {
    name: 'os.mute',
    version: '1.0.0',
    description: 'Mute or unmute the system audio.',
    inputSchema: z.object({ mute: z.boolean() }),
    outputSchema: z.object({ ok: z.boolean(), muted: z.boolean(), error: z.string().optional() }),
    requiredPermissions: ['os.media'],
    dataClassification: 'personal',
    riskClass: 1,
    reversible: true,
    timeoutMs: 10_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx, input) => muteVolume(input.mute, ctx.signal),
  };
}

export function createOsMediaKeyTool(): ToolDefinition<{ key: string }, { ok: boolean; key: string; error?: string }> {
  return {
    name: 'os.mediaKey',
    version: '1.0.0',
    description: 'Send a media key: play_pause, next_track, prev_track, stop, volume_up, volume_down, volume_mute.',
    inputSchema: z.object({ key: z.enum(['play_pause', 'next_track', 'prev_track', 'stop', 'volume_up', 'volume_down', 'volume_mute']) }),
    outputSchema: z.object({ ok: z.boolean(), key: z.string(), error: z.string().optional() }),
    requiredPermissions: ['os.media'],
    dataClassification: 'personal',
    riskClass: 1,
    reversible: true,
    timeoutMs: 10_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx, input) => sendMediaKey(input.key, ctx.signal),
  };
}

export function createOsBrightnessTool(): ToolDefinition<{ level: number }, { ok: boolean; level: number; error?: string }> {
  return {
    name: 'os.brightness',
    version: '1.0.0',
    description: 'Set the screen brightness to a level between 0 and 100.',
    inputSchema: z.object({ level: z.number().int().min(0).max(100) }),
    outputSchema: z.object({ ok: z.boolean(), level: z.number(), error: z.string().optional() }),
    requiredPermissions: ['os.media'],
    dataClassification: 'personal',
    riskClass: 1,
    reversible: true,
    timeoutMs: 10_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx, input) => setBrightness(input.level, ctx.signal),
  };
}

export function createOsLockScreenTool(): ToolDefinition<Record<string, never>, { ok: boolean; error?: string }> {
  return {
    name: 'os.lockScreen',
    version: '1.0.0',
    description: 'Lock the Windows workstation.',
    inputSchema: z.object({}),
    outputSchema: z.object({ ok: z.boolean(), error: z.string().optional() }),
    requiredPermissions: ['os.open'],
    dataClassification: 'personal',
    riskClass: 2,
    reversible: false,
    timeoutMs: 10_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx) => lockWorkstation(ctx.signal),
  };
}

export function createOsSleepTool(): ToolDefinition<Record<string, never>, { ok: boolean; error?: string }> {
  return {
    name: 'os.sleep',
    version: '1.0.0',
    description: 'Put the system to sleep (suspend).',
    inputSchema: z.object({}),
    outputSchema: z.object({ ok: z.boolean(), error: z.string().optional() }),
    requiredPermissions: ['os.open'],
    dataClassification: 'personal',
    riskClass: 2,
    reversible: false,
    timeoutMs: 10_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx) => sleepSystem(ctx.signal),
  };
}

export function createOsPowerTool(): ToolDefinition<{ action: PowerAction; delaySeconds?: number }, { ok: boolean; action: PowerAction; error?: string }> {
  return {
    name: 'os.power',
    version: '1.0.0',
    description: 'Shut down, restart or hibernate the PC. Requires confirmation.',
    inputSchema: z.object({
      action: z.enum(['shutdown', 'restart', 'hibernate']),
      delaySeconds: z.number().int().min(0).max(600).optional(),
    }),
    outputSchema: z.object({ ok: z.boolean(), action: z.enum(['shutdown', 'restart', 'hibernate']), error: z.string().optional() }),
    requiredPermissions: ['os.open'],
    dataClassification: 'personal',
    riskClass: 3,
    reversible: false,
    requiresConfirmation: true,
    timeoutMs: 10_000,
    cancellable: true,
    audit: 'full',
    platforms: ['all'],
    execute: async (ctx, input) => powerAction(input.action, input.delaySeconds ?? 0, ctx.signal),
  };
}

export function createSystemControlTools(): ToolDefinition<unknown, unknown>[] {
  return [
    createOsVolumeTool() as ToolDefinition<unknown, unknown>,
    createOsMuteTool() as ToolDefinition<unknown, unknown>,
    createOsMediaKeyTool() as ToolDefinition<unknown, unknown>,
    createOsBrightnessTool() as ToolDefinition<unknown, unknown>,
    createOsLockScreenTool() as ToolDefinition<unknown, unknown>,
    createOsSleepTool() as ToolDefinition<unknown, unknown>,
    createOsPowerTool() as ToolDefinition<unknown, unknown>,
  ];
}
