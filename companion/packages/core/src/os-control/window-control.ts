/**
 * Window and process management tools.
 * Close apps, switch windows, minimize/maximize, list/kill processes.
 */

import { execFile, spawn } from 'node:child_process';
import { z } from 'zod';
import type { ToolDefinition } from '../tools/contracts.js';

function runPowerShell(script: string, signal?: AbortSignal, timeoutMs = 15_000): Promise<{ stdout: string; stderr: string; code: number }> {
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

// ── Close application ───────────────────────────────────────────────

export async function closeApp(processName: string, signal?: AbortSignal): Promise<{ closed: boolean; process: string; error?: string }> {
  const trimmed = processName.trim();
  if (!trimmed) return { closed: false, process: '', error: 'empty_process_name' };
  // Ensure .exe extension
  const exe = trimmed.toLowerCase().endsWith('.exe') ? trimmed : `${trimmed}.exe`;
  const script = `Stop-Process -Name "${exe.replace(/\.exe$/i, '')}" -Force -ErrorAction SilentlyContinue; Write-Output "closed"`;
  const result = await runPowerShell(script, signal);
  if (result.code !== 0 && !result.stdout) {
    return { closed: false, process: exe, error: result.stderr.trim() || `exit ${result.code}` };
  }
  return { closed: true, process: exe };
}

// ── Switch to application ───────────────────────────────────────────

export async function switchApp(processName: string, signal?: AbortSignal): Promise<{ switched: boolean; process: string; error?: string }> {
  const trimmed = processName.trim();
  if (!trimmed) return { switched: false, process: '', error: 'empty_process_name' };
  const exe = trimmed.toLowerCase().endsWith('.exe') ? trimmed : `${trimmed}.exe`;
  const script = [
    '$proc = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -match "' + exe.replace(/\.exe$/i, '') + '" } | Select-Object -First 1',
    'if ($proc) {',
    '  # Use Win32 API to bring window to foreground',
    '  Add-Type @"',
    '  using System;',
    '  using System.Runtime.InteropServices;',
    '  public class Win {',
    '    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);',
    '    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);',
    '  }',
    '"@',
    '  $hwnd = $proc.MainWindowHandle',
    '  if ($hwnd -ne [IntPtr]::Zero) {',
    '    [Win]::ShowWindow($hwnd, 9)',
    '    [Win]::SetForegroundWindow($hwnd)',
    '    Write-Output "switched"',
    '  } else { Write-Output "no_window" }',
    '} else { Write-Output "not_found" }',
  ].join('\n');
  const result = await runPowerShell(script, signal);
  if (result.stdout.includes('switched')) return { switched: true, process: exe };
  if (result.stdout.includes('not_found')) return { switched: false, process: exe, error: 'process_not_found' };
  if (result.stdout.includes('no_window')) return { switched: false, process: exe, error: 'no_visible_window' };
  return { switched: false, process: exe, error: result.stderr.trim() || `exit ${result.code}` };
}

// ── Minimize / Maximize active window ───────────────────────────────

export async function minimizeWindow(signal?: AbortSignal): Promise<{ ok: boolean; error?: string }> {
  const script = [
    'Add-Type @"',
    'using System;',
    'using System.Runtime.InteropServices;',
    'public class Win {',
    '  [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);',
    '  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);',
    '  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();',
    '}',
    '"@',
    '$hwnd = [Win]::GetForegroundWindow()',
    'if ($hwnd -ne [IntPtr]::Zero) { [Win]::ShowWindow($hwnd, 6); Write-Output "minimized" }',
    'else { Write-Output "no_window" }',
  ].join('\n');
  const result = await runPowerShell(script, signal);
  if (result.stdout.includes('minimized')) return { ok: true };
  return { ok: false, error: result.stdout.trim() || result.stderr.trim() || 'failed' };
}

export async function maximizeWindow(signal?: AbortSignal): Promise<{ ok: boolean; error?: string }> {
  const script = [
    'Add-Type @"',
    'using System;',
    'using System.Runtime.InteropServices;',
    'public class Win {',
    '  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);',
    '  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();',
    '}',
    '"@',
    '$hwnd = [Win]::GetForegroundWindow()',
    'if ($hwnd -ne [IntPtr]::Zero) { [Win]::ShowWindow($hwnd, 3); Write-Output "maximized" }',
    'else { Write-Output "no_window" }',
  ].join('\n');
  const result = await runPowerShell(script, signal);
  if (result.stdout.includes('maximized')) return { ok: true };
  return { ok: false, error: result.stdout.trim() || result.stderr.trim() || 'failed' };
}

// ── List processes ──────────────────────────────────────────────────

export interface ProcessInfo {
  name: string;
  pid: number;
  memoryMB: number;
}

export async function listProcesses(signal?: AbortSignal): Promise<{ ok: boolean; processes: ProcessInfo[]; error?: string }> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve({ ok: false, processes: [], error: 'aborted' });
    execFile('tasklist', ['/FO', 'CSV', '/NH'], { windowsHide: true, maxBuffer: 1024 * 1024 * 4 }, (error, stdout) => {
      if (error) return resolve({ ok: false, processes: [], error: error.message });
      const lines = stdout.split(/\r?\n/).filter(Boolean);
      const processes: ProcessInfo[] = [];
      for (const line of lines) {
        const cols = line.split(',').map((c) => c.replace(/^"|"$/g, ''));
        if (cols.length >= 5) {
          const name = cols[0] ?? '';
          const pid = Number(cols[1]);
          const memStr = (cols[4] ?? '').replace(/[^\d]/g, '');
          const mem = Number(memStr);
          if (name && Number.isFinite(pid) && pid > 0) {
            processes.push({ name, pid, memoryMB: Number.isFinite(mem) ? mem : 0 });
          }
        }
      }
      // Sort by memory descending, take top 30
      processes.sort((a, b) => b.memoryMB - a.memoryMB);
      resolve({ ok: true, processes: processes.slice(0, 30) });
    });
  });
}

// ── Kill process ────────────────────────────────────────────────────

export async function killProcess(target: string, signal?: AbortSignal): Promise<{ killed: boolean; target: string; error?: string }> {
  const trimmed = target.trim();
  if (!trimmed) return { killed: false, target: '', error: 'empty_target' };
  // If it's a number, kill by PID
  const pid = Number(trimmed);
  const isPid = Number.isInteger(pid) && pid > 0;
  const script = isPid
    ? `Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue; Write-Output "killed"`
    : `Stop-Process -Name "${trimmed.replace(/\.exe$/i, '')}" -Force -ErrorAction SilentlyContinue; Write-Output "killed"`;
  const result = await runPowerShell(script, signal);
  if (result.code !== 0 && !result.stdout) {
    return { killed: false, target: trimmed, error: result.stderr.trim() || `exit ${result.code}` };
  }
  return { killed: true, target: trimmed };
}

// ── Move / resize active window ─────────────────────────────────────

export async function moveWindow(x: number, y: number, signal?: AbortSignal): Promise<{ ok: boolean; x: number; y: number; error?: string }> {
  const px = Math.max(-10000, Math.min(10000, Math.round(x)));
  const py = Math.max(-10000, Math.min(10000, Math.round(y)));
  const script = [
    'Add-Type @"',
    'using System;',
    'using System.Runtime.InteropServices;',
    'public class WinPos {',
    '  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();',
    '  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);',
    '}',
    '"@',
    '$hwnd = [WinPos]::GetForegroundWindow()',
    'if ($hwnd -ne [IntPtr]::Zero) {',
    `  [WinPos]::SetWindowPos($hwnd, [IntPtr]::Zero, ${px}, ${py}, 0, 0, [uint32]0x0001 -bor [uint32]0x0004) | Out-Null`,
    '  Write-Output "moved"',
    '} else { Write-Output "no_window" }',
  ].join('\n');
  const result = await runPowerShell(script, signal);
  if (result.stdout.includes('moved')) return { ok: true, x: px, y: py };
  return { ok: false, x: px, y: py, error: result.stdout.trim() || result.stderr.trim() || 'failed' };
}

export async function resizeWindow(width: number, height: number, signal?: AbortSignal): Promise<{ ok: boolean; width: number; height: number; error?: string }> {
  const w = Math.max(50, Math.min(20000, Math.round(width)));
  const h = Math.max(50, Math.min(20000, Math.round(height)));
  const script = [
    'Add-Type @"',
    'using System;',
    'using System.Runtime.InteropServices;',
    'public class WinSize {',
    '  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();',
    '  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);',
    '}',
    '"@',
    '$hwnd = [WinSize]::GetForegroundWindow()',
    'if ($hwnd -ne [IntPtr]::Zero) {',
    `  [WinSize]::SetWindowPos($hwnd, [IntPtr]::Zero, 0, 0, ${w}, ${h}, [uint32]0x0002 -bor [uint32]0x0004) | Out-Null`,
    '  Write-Output "resized"',
    '} else { Write-Output "no_window" }',
  ].join('\n');
  const result = await runPowerShell(script, signal);
  if (result.stdout.includes('resized')) return { ok: true, width: w, height: h };
  return { ok: false, width: w, height: h, error: result.stdout.trim() || result.stderr.trim() || 'failed' };
}

// ── Tool Definitions ───────────────────────────────────────────────

export function createOsCloseAppTool(): ToolDefinition<{ process: string }, { closed: boolean; process: string; error?: string }> {
  return {
    name: 'os.closeApp',
    version: '1.0.0',
    description: 'Close a running application by process name (e.g. "notepad", "chrome").',
    inputSchema: z.object({ process: z.string().min(1) }),
    outputSchema: z.object({ closed: z.boolean(), process: z.string(), error: z.string().optional() }),
    requiredPermissions: ['os.exec'],
    dataClassification: 'personal',
    riskClass: 2,
    reversible: false,
    timeoutMs: 15_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx, input) => closeApp(input.process, ctx.signal),
  };
}

export function createOsSwitchAppTool(): ToolDefinition<{ process: string }, { switched: boolean; process: string; error?: string }> {
  return {
    name: 'os.switchApp',
    version: '1.0.0',
    description: 'Switch focus to a running application by process name.',
    inputSchema: z.object({ process: z.string().min(1) }),
    outputSchema: z.object({ switched: z.boolean(), process: z.string(), error: z.string().optional() }),
    requiredPermissions: ['os.open'],
    dataClassification: 'personal',
    riskClass: 1,
    reversible: true,
    timeoutMs: 15_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx, input) => switchApp(input.process, ctx.signal),
  };
}

export function createOsMinimizeTool(): ToolDefinition<Record<string, never>, { ok: boolean; error?: string }> {
  return {
    name: 'os.minimize',
    version: '1.0.0',
    description: 'Minimize the active window.',
    inputSchema: z.object({}),
    outputSchema: z.object({ ok: z.boolean(), error: z.string().optional() }),
    requiredPermissions: ['os.open'],
    dataClassification: 'personal',
    riskClass: 1,
    reversible: true,
    timeoutMs: 10_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx) => minimizeWindow(ctx.signal),
  };
}

export function createOsMaximizeTool(): ToolDefinition<Record<string, never>, { ok: boolean; error?: string }> {
  return {
    name: 'os.maximize',
    version: '1.0.0',
    description: 'Maximize the active window.',
    inputSchema: z.object({}),
    outputSchema: z.object({ ok: z.boolean(), error: z.string().optional() }),
    requiredPermissions: ['os.open'],
    dataClassification: 'personal',
    riskClass: 1,
    reversible: true,
    timeoutMs: 10_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx) => maximizeWindow(ctx.signal),
  };
}

export function createOsListProcessesTool(): ToolDefinition<Record<string, never>, { ok: boolean; processes: ProcessInfo[]; error?: string }> {
  return {
    name: 'os.listProcesses',
    version: '1.0.0',
    description: 'List running processes (top 30 by memory usage).',
    inputSchema: z.object({}),
    outputSchema: z.object({
      ok: z.boolean(),
      processes: z.array(z.object({ name: z.string(), pid: z.number(), memoryMB: z.number() })),
      error: z.string().optional(),
    }),
    requiredPermissions: ['os.open'],
    dataClassification: 'personal',
    riskClass: 1,
    reversible: true,
    timeoutMs: 15_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx) => listProcesses(ctx.signal),
  };
}

export function createOsKillProcessTool(): ToolDefinition<{ target: string }, { killed: boolean; target: string; error?: string }> {
  return {
    name: 'os.killProcess',
    version: '1.0.0',
    description: 'Kill a process by name or PID. Requires confirmation.',
    inputSchema: z.object({ target: z.string().min(1) }),
    outputSchema: z.object({ killed: z.boolean(), target: z.string(), error: z.string().optional() }),
    requiredPermissions: ['os.exec'],
    dataClassification: 'personal',
    riskClass: 3,
    reversible: false,
    requiresConfirmation: true,
    timeoutMs: 15_000,
    cancellable: true,
    audit: 'full',
    platforms: ['all'],
    execute: async (ctx, input) => killProcess(input.target, ctx.signal),
  };
}

export function createOsMoveWindowTool(): ToolDefinition<{ x: number; y: number }, { ok: boolean; x: number; y: number; error?: string }> {
  return {
    name: 'os.moveWindow',
    version: '1.0.0',
    description: 'Move the active window to screen coordinates (x, y).',
    inputSchema: z.object({ x: z.number().int().min(-10000).max(10000), y: z.number().int().min(-10000).max(10000) }),
    outputSchema: z.object({ ok: z.boolean(), x: z.number(), y: z.number(), error: z.string().optional() }),
    requiredPermissions: ['os.open'],
    dataClassification: 'personal',
    riskClass: 1,
    reversible: true,
    timeoutMs: 10_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx, input) => moveWindow(input.x, input.y, ctx.signal),
  };
}

export function createOsResizeWindowTool(): ToolDefinition<{ width: number; height: number }, { ok: boolean; width: number; height: number; error?: string }> {
  return {
    name: 'os.resizeWindow',
    version: '1.0.0',
    description: 'Resize the active window to the given width and height in pixels.',
    inputSchema: z.object({ width: z.number().int().min(50).max(20000), height: z.number().int().min(50).max(20000) }),
    outputSchema: z.object({ ok: z.boolean(), width: z.number(), height: z.number(), error: z.string().optional() }),
    requiredPermissions: ['os.open'],
    dataClassification: 'personal',
    riskClass: 1,
    reversible: true,
    timeoutMs: 10_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx, input) => resizeWindow(input.width, input.height, ctx.signal),
  };
}

export function createWindowControlTools(): ToolDefinition<unknown, unknown>[] {
  return [
    createOsCloseAppTool() as ToolDefinition<unknown, unknown>,
    createOsSwitchAppTool() as ToolDefinition<unknown, unknown>,
    createOsMinimizeTool() as ToolDefinition<unknown, unknown>,
    createOsMaximizeTool() as ToolDefinition<unknown, unknown>,
    createOsListProcessesTool() as ToolDefinition<unknown, unknown>,
    createOsKillProcessTool() as ToolDefinition<unknown, unknown>,
    createOsMoveWindowTool() as ToolDefinition<unknown, unknown>,
    createOsResizeWindowTool() as ToolDefinition<unknown, unknown>,
  ];
}
