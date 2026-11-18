import { describe, expect, it } from 'vitest';
import type { DenylistPolicy } from './contracts.js';
import { defaultDenylistPolicy, isSensitiveTarget } from './target-guard.js';

describe('isSensitiveTarget', () => {
  describe('processes', () => {
    it.each(['KeePassXC.exe', '1Password', 'bit warden', 'Last_Pass.exe', 'nord-pass'])(
      'denies the password manager process "%s"',
      (processName) => {
        expect(isSensitiveTarget({ processName })).toEqual({
          denied: true,
          reason: 'sensitive_process',
        });
      }
    );

    it('denies OS credential surfaces by process name', () => {
      expect(isSensitiveTarget({ processName: 'LogonUI.exe' })).toEqual({
        denied: true,
        reason: 'sensitive_process',
      });
    });
  });

  describe('window titles', () => {
    it.each(['Sign in', 'Windows Security', 'recovery key', 'User Account Control'])(
      'denies the window title "%s"',
      (windowTitle) => {
        expect(isSensitiveTarget({ windowTitle })).toEqual({
          denied: true,
          reason: 'sensitive_window_title',
        });
      }
    );
  });

  describe('targets', () => {
    it.each(['password manager', 'KeePass', 'Windows Security', 'user account control'])(
      'denies the target "%s"',
      (target) => {
        expect(isSensitiveTarget({ target })).toEqual({
          denied: true,
          reason: 'sensitive_target',
        });
      }
    );
  });

  it('reports the process before the window title and target', () => {
    const result = isSensitiveTarget({
      processName: 'bitwarden',
      windowTitle: 'Sign in',
      target: 'password manager',
    });
    expect(result.reason).toBe('sensitive_process');
  });

  it('allows an ordinary target', () => {
    expect(
      isSensitiveTarget({
        processName: 'notepad',
        windowTitle: 'Untitled - Notepad',
        target: 'notepad',
      })
    ).toEqual({ denied: false });
  });

  it('allows an undefined target', () => {
    expect(isSensitiveTarget(undefined)).toEqual({ denied: false });
  });

  it('allows empty targets and empty fields', () => {
    expect(isSensitiveTarget({})).toEqual({ denied: false });
    expect(isSensitiveTarget({ processName: '', windowTitle: '', target: '' })).toEqual({
      denied: false,
    });
  });

  describe('custom policy', () => {
    const custom: DenylistPolicy = {
      processes: ['secretapp'],
      titlePatterns: [/top secret/i],
      targetPatterns: [/vault/i],
    };

    it('denies what the custom policy lists', () => {
      expect(isSensitiveTarget({ processName: 'SecretApp.exe' }, custom).reason).toBe(
        'sensitive_process'
      );
      expect(isSensitiveTarget({ windowTitle: 'Top Secret plans' }, custom).reason).toBe(
        'sensitive_window_title'
      );
      expect(isSensitiveTarget({ target: 'my vault' }, custom).reason).toBe('sensitive_target');
    });

    it('does not apply the default denylist', () => {
      expect(isSensitiveTarget({ processName: 'KeePassXC.exe' }, custom)).toEqual({
        denied: false,
      });
      expect(isSensitiveTarget({ windowTitle: 'Sign in' }, custom)).toEqual({ denied: false });
    });

    it('still denies the same input under the default policy', () => {
      expect(isSensitiveTarget({ processName: 'KeePassXC.exe' }, defaultDenylistPolicy).denied).toBe(
        true
      );
    });
  });
});
