import { describe, expect, it } from 'vitest';
import { readWebPage } from './web-read.js';

/** Build a fake fetch Response */
function fakeResponse(html: string, opts: { status?: number; contentType?: string } = {}): Response {
  const status = opts.status ?? 200;
  const contentType = opts.contentType ?? 'text/html; charset=utf-8';
  const headers = new Headers({ 'content-type': contentType });
  return new Response(html, { status, headers });
}

describe('readWebPage', () => {
  it('fetches and extracts text from an HTML page', async () => {
    const html = `
      <html>
      <head><title>Test Page</title></head>
      <body>
        <nav>Home About</nav>
        <header>Site Header</header>
        <h1>Welcome</h1>
        <p>This is the first paragraph with some content.</p>
        <p>Second paragraph here.</p>
        <footer>Copyright 2026</footer>
        <script>console.log('hidden');</script>
      </body>
      </html>
    `;
    const fetchImpl = async () => fakeResponse(html);
    const result = await readWebPage({ url: 'https://example.com/page', fetchImpl });
    expect(result.url).toBe('https://example.com/page');
    expect(result.title).toBe('Test Page');
    expect(result.contentTrust).toBe('untrusted_content');
    expect(result.text).toContain('first paragraph');
    expect(result.text).toContain('Second paragraph');
    // Nav, header, footer, script should be stripped
    expect(result.text).not.toContain('Home About');
    expect(result.text).not.toContain('Site Header');
    expect(result.text).not.toContain('Copyright');
    expect(result.text).not.toContain("console.log");
  });

  it('returns error for empty URL', async () => {
    const result = await readWebPage({ url: '' });
    expect(result.error).toBe('empty_url');
  });

  it('returns error for invalid URL', async () => {
    const result = await readWebPage({ url: 'not-a-url' });
    expect(result.error).toBe('invalid_url');
  });

  it('returns error for unsupported protocol', async () => {
    const result = await readWebPage({ url: 'ftp://example.com/file' });
    expect(result.error).toBe('unsupported_protocol');
  });

  it('returns error for HTTP error status', async () => {
    const fetchImpl = async () => fakeResponse('Not Found', { status: 404 });
    const result = await readWebPage({ url: 'https://example.com/missing', fetchImpl });
    expect(result.error).toBe('http_404');
  });

  it('returns error for non-HTML content type', async () => {
    const fetchImpl = async () => fakeResponse('binary', { contentType: 'application/octet-stream' });
    const result = await readWebPage({ url: 'https://example.com/file', fetchImpl });
    expect(result.error).toContain('non_html_content_type');
  });

  it('handles text/plain content', async () => {
    const fetchImpl = async () => fakeResponse('Just plain text content.', { contentType: 'text/plain' });
    const result = await readWebPage({ url: 'https://example.com/plain', fetchImpl });
    expect(result.text).toBeTruthy();
    expect(result.text).toContain('Just plain text');
    expect(result.speakable).toContain('Just plain text');
  });

  it('decodes HTML entities', async () => {
    const html = '<p>Tom &amp; Jerry &lt;3 &quot;quotes&quot; &#39;apostrophes&#39;</p>';
    const fetchImpl = async () => fakeResponse(html);
    const result = await readWebPage({ url: 'https://example.com/entities', fetchImpl });
    expect(result.text).toContain('Tom & Jerry');
    expect(result.text).toContain('<3');
    expect(result.text).toContain('"quotes"');
    expect(result.text).toContain("'apostrophes'");
  });

  it('clips speakable text to max length', async () => {
    const longText = 'A'.repeat(10000);
    const html = `<p>${longText}</p>`;
    const fetchImpl = async () => fakeResponse(html);
    const result = await readWebPage({ url: 'https://example.com/long', fetchImpl });
    expect(result.speakable.length).toBeLessThanOrEqual(8000);
  });

  it('returns error for page with no readable content', async () => {
    // No title, no body text — only structural tags
    const html = '<html><head></head><body><div></div></body></html>';
    const fetchImpl = async () => fakeResponse(html);
    const result = await readWebPage({ url: 'https://example.com/empty', fetchImpl });
    expect(result.error).toBe('no_readable_content');
  });

  it('uses hostname as title when title tag is missing', async () => {
    const html = '<html><body><p>Some content</p></body></html>';
    const fetchImpl = async () => fakeResponse(html);
    const result = await readWebPage({ url: 'https://mysite.org/page', fetchImpl });
    expect(result.title).toBe('mysite.org');
  });

  it('respects abort signal', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const result = await readWebPage({ url: 'https://example.com/page', signal: ctrl.signal });
    expect(result.error).toBe('aborted');
  });

  it('handles fetch errors gracefully', async () => {
    const fetchImpl = async () => { throw new Error('network failure'); };
    const result = await readWebPage({ url: 'https://example.com/fail', fetchImpl });
    expect(result.error).toBe('network failure');
    expect(result.contentTrust).toBe('untrusted_content');
  });
});
