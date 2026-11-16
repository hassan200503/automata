/**
 * Native clipboard read/write/clear using PowerShell Get-Clipboard/Set-Clipboard.
 * Separated from the clipboard.ts interface so tools can use the real Windows implementation.
 */

import { spawn } from 'node:child_process';

function runPowerShell(script: string, signal?: AbortSignal, timeoutMs = 5_000): Promise<{ stdout: string; stderr: string; code: number }> {
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

export async function readClipboard(signal?: AbortSignal): Promise<string> {
  const result = await runPowerShell('Get-Clipboard -Raw', signal);
  return result.code === 0 ? result.stdout : '';
}

export async function writeClipboard(text: string, signal?: AbortSignal): Promise<void> {
  // Escape single quotes for PowerShell
  const escaped = text.replace(/'/g, "''");
  await runPowerShell(`Set-Clipboard -Value '${escaped}'`, signal);
}

export async function clearClipboard(signal?: AbortSignal): Promise<void> {
  await runPowerShell('Set-Clipboard -Value ""', signal);
}
