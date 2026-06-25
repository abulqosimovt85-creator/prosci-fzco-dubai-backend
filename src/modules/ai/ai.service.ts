import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import Cerebras from '@cerebras/cerebras_cloud_sdk';
import { Product } from '../../entities/product.entity';

export interface ExtractedProduct {
  name: string;
  description: string;
  specifications: Array<{ key: string; value: string }>;
  application: string;
  isFeatured: boolean;
}

@Injectable()
export class AiService {
  private cerebras: Cerebras;

  constructor() {
    const apiKey = process.env.CEREBRAS_API_KEY;
    if (!apiKey) {
      console.warn('CEREBRAS_API_KEY is not set — AI extraction will fail.');
    }
    this.cerebras = new Cerebras({ apiKey: apiKey ?? '' });
  }

  private isUrl(input: string): boolean {
    const trimmed = input.trim();
    try {
      const url = new URL(trimmed);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private htmlToText(html: string): string {
    let text = html
      // Remove entire script / style / noscript blocks
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove meta and link tags
      .replace(/<meta[\s\S]*?>/gi, '')
      .replace(/<link[\s\S]*?>/gi, '');

    // Preserve table cell separators so spec tables survive as key–value pairs
    text = text
      .replace(/<tr[^>]*>/gi, '\n')
      .replace(/<\/tr>/gi, '')
      .replace(/<th[^>]*>/gi, ' | ')
      .replace(/<\/th>/gi, '')
      .replace(/<td[^>]*>/gi, ' | ')
      .replace(/<\/td>/gi, '');

    // Block-level elements → newlines
    text = text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(
        /<\/?(p|div|h[1-6]|li|dt|dd|blockquote|article|section|main|header|footer|nav)[^>]*>/gi,
        '\n',
      )
      .replace(/<\/?(ul|ol|dl|table|thead|tbody|tfoot)[^>]*>/gi, '\n');

    // Decode common HTML entities
    text = text
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&deg;/gi, '°')
      .replace(/&plusmn;/gi, '±')
      .replace(/&micro;/gi, 'µ')
      .replace(/&Omega;/gi, 'Ω')
      .replace(/&times;/gi, '×')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16)),
      );

    // Strip all remaining tags
    text = text.replace(/<[^>]+>/g, '');

    // Clean up whitespace while keeping meaningful newlines
    text = text
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .filter((line) => line.length > 0)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');

    return text.trim();
  }

  private async fetchPageContent(url: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'identity',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new InternalServerErrorException(
          `Failed to fetch page: HTTP ${response.status} ${response.statusText}`,
        );
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (
        !contentType.includes('html') &&
        !contentType.includes('xml') &&
        !contentType.includes('text')
      ) {
        throw new InternalServerErrorException(
          `URL did not return an HTML page (content-type: ${contentType}).`,
        );
      }

      const html = await response.text();
      const text = this.htmlToText(html);

      if (text.length < 100) {
        throw new InternalServerErrorException(
          'The page returned almost no readable text. It may require JavaScript rendering. Please paste the product specifications as plain text instead.',
        );
      }

      return text;
    } finally {
      clearTimeout(timer);
    }
  }

  async extractProduct(input: string): Promise<Partial<Product>> {
    if (!process.env.CEREBRAS_API_KEY) {
      throw new InternalServerErrorException(
        'CEREBRAS_API_KEY environment variable is not set.',
      );
    }

    // If the input is a URL, fetch the page and use its text content
    let sourceText = input.trim();
    let sourceNote = '';
    if (this.isUrl(sourceText)) {
      sourceText = await this.fetchPageContent(sourceText);
      sourceNote =
        'NOTE: The text below was extracted from a web page. Extract ONLY what is explicitly written here.';
    }

    const prompt = `TASK: Extract product data from the text below into JSON. This is for a professional scientific/industrial equipment catalog.

CRITICAL RULES — READ CAREFULLY:
1. ONLY extract text that APPEARS IN THE SOURCE. Do NOT invent, guess, or use your training knowledge.
2. Look for specification tables — they often have rows like "Parameter name [TAB/COLON] Value" or "| Parameter | Value |". Extract ALL of these as specifications.
3. If you cannot find a specific piece of information in the source text, DO NOT include it. An empty specifications array is better than fake data.
4. NEVER output specifications like "USB", "RS-232", "CE", "ISO 9001" unless those exact strings appear in the source text. These are common hallucinations — do NOT add them.

SOURCE TEXT ANALYSIS — Look for these patterns in the text:
- Table rows with labels and values (e.g., "Electron gun [TAB] Cold field emission gun")
- Lines with "key: value" or "key [TAB] value" format
- Numbered or bulleted specification lists
- Sections titled "Specifications", "Technical Data", "Features", etc.

Return ONLY a valid JSON object:
{
  "name": "Product model name/number ONLY (no manufacturer name)",
  "description": "3-5 sentences describing the product using ONLY facts from the source",
  "specifications": [
    { "key": "Exact parameter name from source", "value": "Exact value from source" }
  ],
  "application": "Intended applications ONLY if explicitly stated in source",
  "isFeatured": false
}

SPECIFICATION EXTRACTION RULES:
- Extract EVERY row from specification tables found in the source
- Use the EXACT parameter name from the source as the "key" (e.g., "Electron gun", "Accelerating voltage", "Specimen cooling temperature")
- Use the EXACT value from the source as the "value" (e.g., "Cold field emission gun", "300 kV, 200 kV", "100 K or less")
- If a parameter has sub-parameters (indented under it), include BOTH the parent and child as separate specs
- If there are multiple variants/modes listed, create a separate spec for each
- Copy units exactly (kV, K, mm, °, etc.) — do NOT convert or normalize
- Do NOT add any specification that is not explicitly written in the source

PRODUCT NAME RULES:
- Use ONLY the model name/number from the source (e.g., "CRYO ARM 300 II", "JEM-3300")
- Do NOT include the manufacturer in the name
- The manufacturer goes as the first specification row with key "Manufacturer"

DESCRIPTION RULES:
- Write 3-5 professional sentences
- Start with what the product IS
- Include its main function and key capabilities as described in source
- Only include applications/use cases that are explicitly mentioned
- Do NOT add generic marketing language

WHAT NOT TO DO:
- Do NOT output "USB / RS-232 serial" unless the source literally says that
- Do NOT output "CE / ISO 9001" unless the source literally says that
- Do NOT output generic specs like "Operating range: 0-100%" for a scientific instrument
- Do NOT guess interfaces, certifications, or standards
- Do NOT add any information that requires inference or general knowledge

Return ONLY the JSON object. No markdown fences, no explanation, no thinking.

SOURCE TEXT:
---
${sourceText.substring(0, 25000)}
---`;

    let rawText = '';
    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const completion = (await this.cerebras.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'qwen-3-235b-a22b-instruct-2507',
          max_completion_tokens: 8192,
          temperature: 0,
          top_p: 1,
          stream: false,
        })) as any;
        rawText = completion.choices?.[0]?.message?.content ?? '';
        break;
      } catch (err) {
        const msg = (err as Error).message || '';
        if (msg.includes('429') && attempt < maxRetries) {
          // Exponential backoff: 2s, 4s, 8s
          await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt)));
          continue;
        }
        if (msg.includes('429')) {
          throw new ServiceUnavailableException(
            'Cerebras API is experiencing high traffic. Please try again in a minute.',
          );
        }
        throw new InternalServerErrorException(`Cerebras API error: ${msg}`);
      }
    }

    if (!rawText) {
      throw new InternalServerErrorException(
        'Cerebras returned an empty response.',
      );
    }

    // Strip markdown code fences if present
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new InternalServerErrorException(
        `Could not parse AI response as JSON. Raw: ${cleaned.substring(0, 300)}`,
      );
    }

    // Convert specifications array to Record<string, string> for Product entity
    const specs: Record<string, string> = {};
    if (Array.isArray(parsed.specifications)) {
      parsed.specifications.forEach((s: any) => {
        if (s && typeof s.key === 'string' && typeof s.value === 'string') {
          specs[s.key] = s.value;
        }
      });
    }

    // Validate & normalise
    return {
      name: String(parsed.name ?? 'Generated Product').trim(),
      description: String(parsed.description ?? '').trim(),
      specs: specs,
      application: String(
        parsed.application ??
          'Scientific laboratory research as specified in extracted documentation.',
      ).trim(),
    };
  }
}
