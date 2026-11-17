/**
 * Web page reading tool — fetches a URL and extracts readable text content.
 * Results are untrusted_content: never treated as owner intent.
 *
 * Uses a lightweight HTML-to-text extraction (no external dependencies).
 * Strips scripts, styles, navigation, and returns speakable paragraphs.
 */

const MAX_CONTENT_CHARS = 8000;

export interface WebReadPageResult {
  url: string;
  title: string;
  text: string;
  speakable: string;
  error?: string;
  contentTrust: 'untrusted_content';
}

export interface WebReadPageOptions {
  url: string;
  signal?: AbortSignal;
  /** Injectable fetch for tests. */
  fetchImpl?: typeof fetch;
  readAloud?: boolean;
}

function stripHtmlTags(html: string): { title: string; text: string } {
  // Extract title
  let title = '';
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch?.[1]) {
    title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  // Remove script and style blocks entirely
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Convert <br>, <p>, <div> to newlines
  cleaned = cleaned
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n');

  // Remove all remaining tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '...')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));

  // Normalize whitespace
  cleaned = cleaned
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');

  return { title, text: cleaned };
}

function clipSpeakable(text: string, max = MAX_CONTENT_CHARS): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max - 3);
  const lastParagraph = slice.lastIndexOf('\n\n');
  if (lastParagraph >= Math.floor(max * 0.5)) {
    return slice.slice(0, lastParagraph).trim();
  }
  return `${slice.trim()}…`;
}

/**
 * Fetch a web page and extract readable text content.
 * Results are untrusted_content — never treat them as owner intent.
 */
export async function readWebPage(options: WebReadPageOptions): Promise<WebReadPageResult> {
  const url = options.url.trim();
  if (!url) return { url: '', title: '', text: '', speakable: '', error: 'empty_url', contentTrust: 'untrusted_content' };

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { url, title: '', text: '', speakable: '', error: 'invalid_url', contentTrust: 'untrusted_content' };
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { url, title: '', text: '', speakable: '', error: 'unsupported_protocol', contentTrust: 'untrusted_content' };
  }

  if (options.signal?.aborted) {
    return { url, title: '', text: '', speakable: '', error: 'aborted', contentTrust: 'untrusted_content' };
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);

  try {
    const response = await fetchImpl(url, {
      signal: options.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'CompanionBot/1.0 (web.readPage)',
      },
    });

    if (!response.ok) {
      return {
        url,
        title: '',
        text: '',
        speakable: '',
        error: `http_${response.status}`,
        contentTrust: 'untrusted_content',
      };
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      // Not an HTML page — return the raw text if it's text-based
      if (contentType.startsWith('text/')) {
        const rawText = await response.text();
        const speakable = clipSpeakable(rawText);
        return { url, title: parsedUrl.hostname, text: rawText.slice(0, MAX_CONTENT_CHARS), speakable, contentTrust: 'untrusted_content' };
      }
      return {
        url,
        title: '',
        text: '',
        speakable: '',
        error: `non_html_content_type:${contentType}`,
        contentTrust: 'untrusted_content',
      };
    }

    const html = await response.text();
    const { title, text } = stripHtmlTags(html);

    if (!text.trim()) {
      return {
        url,
        title: title || parsedUrl.hostname,
        text: '',
        speakable: '',
        error: 'no_readable_content',
        contentTrust: 'untrusted_content',
      };
    }

    const speakable = clipSpeakable(text);

    return {
      url,
      title: title || parsedUrl.hostname,
      text: text.slice(0, MAX_CONTENT_CHARS),
      speakable,
      contentTrust: 'untrusted_content',
    };
  } catch (error) {
    if (options.signal?.aborted) {
      return { url, title: '', text: '', speakable: '', error: 'aborted', contentTrust: 'untrusted_content' };
    }
    return {
      url,
      title: '',
      text: '',
      speakable: '',
      error: error instanceof Error ? error.message : String(error),
      contentTrust: 'untrusted_content',
    };
  }
}
