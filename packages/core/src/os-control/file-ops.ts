/**
 * File operation tools: list, search, copy, move, delete files, create folders.
 * Uses Node.js fs module — no PowerShell needed for most operations.
 */

import { z } from 'zod';
import type { ToolDefinition } from '../tools/contracts.js';

// ── List files ──────────────────────────────────────────────────────

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: string;
}

export async function listFiles(dirPath: string, signal?: AbortSignal): Promise<{ ok: boolean; files: FileEntry[]; error?: string }> {
  if (!dirPath) return { ok: false, files: [], error: 'empty_path' };
  if (signal?.aborted) return { ok: false, files: [], error: 'aborted' };
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const resolved = path.resolve(dirPath);
    if (!fs.existsSync(resolved)) {
      return { ok: false, files: [], error: 'path_not_found' };
    }
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      return { ok: false, files: [], error: 'not_a_directory' };
    }
    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    const files: FileEntry[] = [];
    for (const entry of entries) {
      if (signal?.aborted) return { ok: false, files: [], error: 'aborted' };
      try {
        const fullPath = path.join(resolved, entry.name);
        const entryStat = fs.statSync(fullPath);
        files.push({
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          size: entryStat.size,
          modified: entryStat.mtime.toISOString(),
        });
      } catch {
        // Skip entries that can't be stat'd (permissions, etc.)
      }
    }
    files.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return { ok: true, files: files.slice(0, 100) };
  } catch (error) {
    return { ok: false, files: [], error: error instanceof Error ? error.message : String(error) };
  }
}

// ── Search files ────────────────────────────────────────────────────

export async function searchFiles(dirPath: string, pattern: string, signal?: AbortSignal): Promise<{ ok: boolean; results: FileEntry[]; error?: string }> {
  if (!dirPath || !pattern) return { ok: false, results: [], error: 'empty_path_or_pattern' };
  if (signal?.aborted) return { ok: false, results: [], error: 'aborted' };
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const resolved = path.resolve(dirPath);
    if (!fs.existsSync(resolved)) {
      return { ok: false, results: [], error: 'path_not_found' };
    }
    const results: FileEntry[] = [];
    const maxResults = 50;
    const maxDepth = 3;
    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'), 'i');

    function walk(dir: string, depth: number): void {
      if (depth >= maxDepth || results.length >= maxResults || signal?.aborted) return;
      let entries: import('node:fs').Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (results.length >= maxResults || signal?.aborted) return;
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        if (regex.test(entry.name)) {
          try {
            const stat = fs.statSync(fullPath);
            results.push({
              name: entry.name,
              path: fullPath,
              isDirectory: entry.isDirectory(),
              size: stat.size,
              modified: stat.mtime.toISOString(),
            });
          } catch { /* skip */ }
        }
        if (entry.isDirectory()) {
          walk(fullPath, depth + 1);
        }
      }
    }

    walk(resolved, 0);
    return { ok: true, results };
  } catch (error) {
    return { ok: false, results: [], error: error instanceof Error ? error.message : String(error) };
  }
}

// ── Copy file ───────────────────────────────────────────────────────

export async function copyFile(source: string, destination: string, signal?: AbortSignal): Promise<{ ok: boolean; source: string; destination: string; error?: string }> {
  if (!source || !destination) return { ok: false, source, destination, error: 'empty_source_or_destination' };
  if (signal?.aborted) return { ok: false, source, destination, error: 'aborted' };
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = path.resolve(source);
    const dst = path.resolve(destination);
    if (!fs.existsSync(src)) return { ok: false, source: src, destination: dst, error: 'source_not_found' };
    const stat = fs.statSync(src);
    if (stat.isDirectory()) return { ok: false, source: src, destination: dst, error: 'source_is_directory' };
    // Ensure destination directory exists
    const dstDir = path.dirname(dst);
    if (!fs.existsSync(dstDir)) {
      fs.mkdirSync(dstDir, { recursive: true });
    }
    await fs.promises.copyFile(src, dst);
    return { ok: true, source: src, destination: dst };
  } catch (error) {
    return { ok: false, source, destination, error: error instanceof Error ? error.message : String(error) };
  }
}

// ── Move file ───────────────────────────────────────────────────────

export async function moveFile(source: string, destination: string, signal?: AbortSignal): Promise<{ ok: boolean; source: string; destination: string; error?: string }> {
  if (!source || !destination) return { ok: false, source, destination, error: 'empty_source_or_destination' };
  if (signal?.aborted) return { ok: false, source, destination, error: 'aborted' };
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = path.resolve(source);
    const dst = path.resolve(destination);
    if (!fs.existsSync(src)) return { ok: false, source: src, destination: dst, error: 'source_not_found' };
    const dstDir = path.dirname(dst);
    if (!fs.existsSync(dstDir)) {
      fs.mkdirSync(dstDir, { recursive: true });
    }
    await fs.promises.rename(src, dst);
    return { ok: true, source: src, destination: dst };
  } catch (error) {
    return { ok: false, source, destination, error: error instanceof Error ? error.message : String(error) };
  }
}

// ── Delete file ─────────────────────────────────────────────────────

export async function deleteFile(target: string, signal?: AbortSignal): Promise<{ ok: boolean; target: string; error?: string }> {
  if (!target) return { ok: false, target: '', error: 'empty_target' };
  if (signal?.aborted) return { ok: false, target, error: 'aborted' };
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const resolved = path.resolve(target);
    if (!fs.existsSync(resolved)) return { ok: false, target: resolved, error: 'not_found' };
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      fs.rmSync(resolved, { recursive: true });
    } else {
      fs.unlinkSync(resolved);
    }
    return { ok: true, target: resolved };
  } catch (error) {
    return { ok: false, target, error: error instanceof Error ? error.message : String(error) };
  }
}

// ── Create folder ───────────────────────────────────────────────────

export async function createFolder(dirPath: string, signal?: AbortSignal): Promise<{ ok: boolean; path: string; error?: string }> {
  if (!dirPath) return { ok: false, path: '', error: 'empty_path' };
  if (signal?.aborted) return { ok: false, path: dirPath, error: 'aborted' };
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const resolved = path.resolve(dirPath);
    fs.mkdirSync(resolved, { recursive: true });
    return { ok: true, path: resolved };
  } catch (error) {
    return { ok: false, path: dirPath, error: error instanceof Error ? error.message : String(error) };
  }
}

// ── Tool Definitions ───────────────────────────────────────────────

const fileEntrySchema = z.object({
  name: z.string(),
  path: z.string(),
  isDirectory: z.boolean(),
  size: z.number(),
  modified: z.string(),
});

export function createOsListFilesTool(): ToolDefinition<{ path: string }, { ok: boolean; files: FileEntry[]; error?: string }> {
  return {
    name: 'os.listFiles',
    version: '1.0.0',
    description: 'List files in a directory (max 100 entries, directories first).',
    inputSchema: z.object({ path: z.string().min(1) }),
    outputSchema: z.object({ ok: z.boolean(), files: z.array(fileEntrySchema), error: z.string().optional() }),
    requiredPermissions: ['os.open'],
    dataClassification: 'personal',
    riskClass: 1,
    reversible: true,
    timeoutMs: 10_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx, input) => listFiles(input.path, ctx.signal),
  };
}

export function createOsSearchFilesTool(): ToolDefinition<{ path: string; pattern: string }, { ok: boolean; results: FileEntry[]; error?: string }> {
  return {
    name: 'os.searchFiles',
    version: '1.0.0',
    description: 'Search for files by name pattern (wildcards * and ?) up to 3 levels deep.',
    inputSchema: z.object({ path: z.string().min(1), pattern: z.string().min(1) }),
    outputSchema: z.object({ ok: z.boolean(), results: z.array(fileEntrySchema), error: z.string().optional() }),
    requiredPermissions: ['os.open'],
    dataClassification: 'personal',
    riskClass: 1,
    reversible: true,
    timeoutMs: 15_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx, input) => searchFiles(input.path, input.pattern, ctx.signal),
  };
}

export function createOsCopyFileTool(): ToolDefinition<{ source: string; destination: string }, { ok: boolean; source: string; destination: string; error?: string }> {
  return {
    name: 'os.copyFile',
    version: '1.0.0',
    description: 'Copy a file from source to destination.',
    inputSchema: z.object({ source: z.string().min(1), destination: z.string().min(1) }),
    outputSchema: z.object({ ok: z.boolean(), source: z.string(), destination: z.string(), error: z.string().optional() }),
    requiredPermissions: ['os.exec'],
    dataClassification: 'personal',
    riskClass: 2,
    reversible: true,
    timeoutMs: 30_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx, input) => copyFile(input.source, input.destination, ctx.signal),
  };
}

export function createOsMoveFileTool(): ToolDefinition<{ source: string; destination: string }, { ok: boolean; source: string; destination: string; error?: string }> {
  return {
    name: 'os.moveFile',
    version: '1.0.0',
    description: 'Move or rename a file from source to destination.',
    inputSchema: z.object({ source: z.string().min(1), destination: z.string().min(1) }),
    outputSchema: z.object({ ok: z.boolean(), source: z.string(), destination: z.string(), error: z.string().optional() }),
    requiredPermissions: ['os.exec'],
    dataClassification: 'personal',
    riskClass: 2,
    reversible: true,
    timeoutMs: 30_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx, input) => moveFile(input.source, input.destination, ctx.signal),
  };
}

export function createOsDeleteFileTool(): ToolDefinition<{ target: string }, { ok: boolean; target: string; error?: string }> {
  return {
    name: 'os.deleteFile',
    version: '1.0.0',
    description: 'Delete a file or empty directory. Requires confirmation.',
    inputSchema: z.object({ target: z.string().min(1) }),
    outputSchema: z.object({ ok: z.boolean(), target: z.string(), error: z.string().optional() }),
    requiredPermissions: ['os.exec'],
    dataClassification: 'personal',
    riskClass: 3,
    reversible: false,
    requiresConfirmation: true,
    timeoutMs: 15_000,
    cancellable: true,
    audit: 'full',
    platforms: ['all'],
    execute: async (ctx, input) => deleteFile(input.target, ctx.signal),
  };
}

export function createOsCreateFolderTool(): ToolDefinition<{ path: string }, { ok: boolean; path: string; error?: string }> {
  return {
    name: 'os.createFolder',
    version: '1.0.0',
    description: 'Create a directory (including parent directories if needed).',
    inputSchema: z.object({ path: z.string().min(1) }),
    outputSchema: z.object({ ok: z.boolean(), path: z.string(), error: z.string().optional() }),
    requiredPermissions: ['os.exec'],
    dataClassification: 'personal',
    riskClass: 1,
    reversible: true,
    timeoutMs: 10_000,
    cancellable: true,
    audit: 'metadata',
    platforms: ['all'],
    execute: async (ctx, input) => createFolder(input.path, ctx.signal),
  };
}

export function createFileOpsTools(): ToolDefinition<unknown, unknown>[] {
  return [
    createOsListFilesTool() as ToolDefinition<unknown, unknown>,
    createOsSearchFilesTool() as ToolDefinition<unknown, unknown>,
    createOsCopyFileTool() as ToolDefinition<unknown, unknown>,
    createOsMoveFileTool() as ToolDefinition<unknown, unknown>,
    createOsDeleteFileTool() as ToolDefinition<unknown, unknown>,
    createOsCreateFolderTool() as ToolDefinition<unknown, unknown>,
  ];
}
