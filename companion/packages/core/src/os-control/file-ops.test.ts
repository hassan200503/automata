import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import {
  createFileOpsTools,
  createOsListFilesTool,
  createOsDeleteFileTool,
  listFiles,
  searchFiles,
  copyFile,
  moveFile,
  deleteFile,
  createFolder,
} from './file-ops.js';

describe('file-ops tools', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'companion-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('createFileOpsTools', () => {
    it('returns all 6 tools', () => {
      const tools = createFileOpsTools();
      expect(tools).toHaveLength(6);
      const names = tools.map((t) => t.name);
      expect(names).toEqual([
        'os.listFiles',
        'os.searchFiles',
        'os.copyFile',
        'os.moveFile',
        'os.deleteFile',
        'os.createFolder',
      ]);
    });
  });

  describe('os.listFiles tool definition', () => {
    it('has correct metadata', () => {
      const tool = createOsListFilesTool();
      expect(tool.name).toBe('os.listFiles');
      expect(tool.riskClass).toBe(1);
      expect(tool.requiredPermissions).toEqual(['os.open']);
      expect(tool.reversible).toBe(true);
    });
  });

  describe('os.deleteFile tool definition', () => {
    it('requires confirmation and full audit', () => {
      const tool = createOsDeleteFileTool();
      expect(tool.riskClass).toBe(3);
      expect(tool.requiresConfirmation).toBe(true);
      expect(tool.audit).toBe('full');
      expect(tool.reversible).toBe(false);
    });
  });

  describe('listFiles function', () => {
    it('lists files in a directory', async () => {
      writeFileSync(join(tempDir, 'a.txt'), 'content A');
      writeFileSync(join(tempDir, 'b.txt'), 'content B');
      mkdirSync(join(tempDir, 'subdir'));

      const result = await listFiles(tempDir);
      expect(result.ok).toBe(true);
      expect(result.files).toHaveLength(3);

      // Directories should come first
      expect(result.files[0]?.isDirectory).toBe(true);
      expect(result.files[0]?.name).toBe('subdir');

      const fileNames = result.files.filter((f) => !f.isDirectory).map((f) => f.name);
      expect(fileNames).toEqual(['a.txt', 'b.txt']);
    });

    it('returns error for empty path', async () => {
      const result = await listFiles('');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('empty_path');
    });

    it('returns error for non-existent path', async () => {
      const result = await listFiles(join(tempDir, 'does-not-exist'));
      expect(result.ok).toBe(false);
      expect(result.error).toBe('path_not_found');
    });

    it('returns error for a file path (not directory)', async () => {
      const filePath = join(tempDir, 'file.txt');
      writeFileSync(filePath, 'test');
      const result = await listFiles(filePath);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('not_a_directory');
    });

    it('respects abort signal', async () => {
      const ctrl = new AbortController();
      ctrl.abort();
      const result = await listFiles(tempDir, ctrl.signal);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('aborted');
    });
  });

  describe('searchFiles function', () => {
    beforeEach(() => {
      writeFileSync(join(tempDir, 'report.pdf'), 'pdf');
      writeFileSync(join(tempDir, 'notes.txt'), 'notes');
      mkdirSync(join(tempDir, 'subdir'));
      writeFileSync(join(tempDir, 'subdir', 'report.docx'), 'doc');
    });

    it('finds files matching a wildcard pattern', async () => {
      const result = await searchFiles(tempDir, 'report*');
      expect(result.ok).toBe(true);
      expect(result.results.length).toBe(2);
      const names = result.results.map((r) => r.name);
      expect(names).toContain('report.pdf');
      expect(names).toContain('report.docx');
    });

    it('finds files by extension', async () => {
      const result = await searchFiles(tempDir, '*.txt');
      expect(result.ok).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.name).toBe('notes.txt');
    });

    it('returns error for empty path or pattern', async () => {
      expect((await searchFiles('', '*')).error).toBe('empty_path_or_pattern');
      expect((await searchFiles(tempDir, '')).error).toBe('empty_path_or_pattern');
    });
  });

  describe('copyFile function', () => {
    it('copies a file to a new location', async () => {
      const src = join(tempDir, 'original.txt');
      const dst = join(tempDir, 'copy.txt');
      writeFileSync(src, 'test content');

      const result = await copyFile(src, dst);
      expect(result.ok).toBe(true);
      expect(existsSync(dst)).toBe(true);
    });

    it('returns error for non-existent source', async () => {
      const result = await copyFile(join(tempDir, 'nope.txt'), join(tempDir, 'dst.txt'));
      expect(result.ok).toBe(false);
      expect(result.error).toBe('source_not_found');
    });

    it('returns error for directory source', async () => {
      const result = await copyFile(tempDir, join(tempDir, 'dst'));
      expect(result.ok).toBe(false);
      expect(result.error).toBe('source_is_directory');
    });
  });

  describe('moveFile function', () => {
    it('moves a file to a new location', async () => {
      const src = join(tempDir, 'move-me.txt');
      const dst = join(tempDir, 'moved.txt');
      writeFileSync(src, 'content');

      const result = await moveFile(src, dst);
      expect(result.ok).toBe(true);
      expect(existsSync(src)).toBe(false);
      expect(existsSync(dst)).toBe(true);
    });
  });

  describe('deleteFile function', () => {
    it('deletes a file', async () => {
      const file = join(tempDir, 'delete-me.txt');
      writeFileSync(file, 'content');

      const result = await deleteFile(file);
      expect(result.ok).toBe(true);
      expect(existsSync(file)).toBe(false);
    });

    it('deletes a directory recursively', async () => {
      const dir = join(tempDir, 'delete-dir');
      mkdirSync(dir);
      writeFileSync(join(dir, 'inner.txt'), 'content');

      const result = await deleteFile(dir);
      expect(result.ok).toBe(true);
      expect(existsSync(dir)).toBe(false);
    });

    it('returns error for non-existent target', async () => {
      const result = await deleteFile(join(tempDir, 'nope.txt'));
      expect(result.ok).toBe(false);
      expect(result.error).toBe('not_found');
    });
  });

  describe('createFolder function', () => {
    it('creates a directory with parents', async () => {
      const dir = join(tempDir, 'a', 'b', 'c');
      const result = await createFolder(dir);
      expect(result.ok).toBe(true);
      expect(existsSync(dir)).toBe(true);
    });

    it('returns ok when directory already exists', async () => {
      const dir = join(tempDir, 'existing');
      mkdirSync(dir);
      const result = await createFolder(dir);
      expect(result.ok).toBe(true);
    });
  });
});
