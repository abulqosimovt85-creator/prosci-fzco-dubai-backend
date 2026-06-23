import { Injectable, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import Cerebras from '@cerebras/cerebras_cloud_sdk';
import { Product } from '../../entities/product.entity';

export interface ExtractedProduct {
  name: string;
  description: string;
  specifications: Array<{ key: string; value: string }>;
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
      .replace(/<!--[\s\S]*?-->/g, '');

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
      .replace(/<\/?(p|div|h[1-6]|li|dt|dd|blockquote|article|section|main|header|footer|nav)[^>]*>/gi, '\n')
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
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

    // Strip all remaining tags
    text = text.replace(/<[^>]+>/g, '');

    // Clean up whitespace while keeping meaningful newlines
    text = text
      .split('\n')
      .map(line => line.replace(/[ \t]+/g, ' ').trim())
      .filter(line => line.length > 0)
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
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
      if (!contentType.includes('html') && !contentType.includes('xml') && !contentType.includes('text')) {
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
      sourceNote = 'NOTE: The text below was extracted from a web page. Extract ONLY what is explicitly written here.';
    }

    const prompt = `You are a strict, fact-only product data extraction assistant for a professional scientific/industrial equipment catalog.
${sourceNote ? `\n${sourceNote}\n` : ''}
ABSOLUTE RULE — ZERO HALLUCINATION:
You must ONLY extract information that is EXPLICITLY stated in the source text below. If a value, parameter, specification, or detail is NOT written in the source, you MUST NOT include it, infer it, guess it, or fill it in from your general knowledge. This is a professional catalog — every single data point must be verifiable against the source text. Accuracy is more important than completeness.

Return ONLY a valid JSON object with this exact structure:
{
  "name": "Product model name only (no manufacturer)",
  "description": "2-4 sentences describing the product based ONLY on what the source text says.",
  "specifications": [
    { "key": "Manufacturer", "value": "Manufacturer/brand name" },
    { "key": "Parameter name", "value": "Value with unit" }
  ],
  "isFeatured": false
}

STRICT EXTRACTION RULES:
- Extract ONLY specifications, parameters, and values that appear verbatim or near-verbatim in the source text
- NEVER add specifications from your training data or general knowledge about similar products
- NEVER guess units, ranges, tolerances, ratings, or certifications that are not in the source
- NEVER infer operating temperature, IP rating, weight, dimensions, protocols, or any parameter not explicitly mentioned
- If a value is ambiguous or unclear in the source, include it with the exact wording from the source — do NOT "correct" or "clarify" it
- Copy numeric values and units EXACTLY as they appear in the source (do not convert units)
- If a single parameter has multiple values (e.g. different modes/ranges), list each as a SEPARATE spec row
- Keep spec "key" concise (≤ 40 chars) and "value" exact as written in the source
- Order specifications logically: General info → Measurement specs → Electrical → Physical → Environmental → Communication → Certifications
- DO NOT merge or summarize multiple parameters into one
- If the source lists options/variants, include them all
- When you see table rows formatted as "| label | value |", treat them as specification key-value pairs

RULES FOR OTHER FIELDS:
- "name": Use ONLY the product model name/number as stated in the source (e.g. "V800", "HydroSense 3000"). Do NOT include the manufacturer or brand in the name — the manufacturer MUST be included as the FIRST specification row with key "Manufacturer" instead.
- "description": Write 2-4 professional sentences using ONLY facts from the source text. Do NOT add application areas, advantages, or use cases that are not mentioned in the source.
- "isFeatured": false (unless the source EXPLICITLY says flagship/premium/top-of-line)
- Return ONLY the JSON, no markdown fences, no explanation, no thinking

Product information:
---
${sourceText.substring(0, 18000)}
---`;

    let rawText = '';
    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const completion = await this.cerebras.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'qwen-3-235b-a22b-instruct-2507',
          max_completion_tokens: 4096,
          temperature: 0,
          top_p: 1,
          stream: false,
        }) as any;
        rawText = completion.choices?.[0]?.message?.content ?? '';
        break;
      } catch (err) {
        const msg = (err as Error).message || '';
        if (msg.includes('429') && attempt < maxRetries) {
          // Exponential backoff: 2s, 4s, 8s
          await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt)));
          continue;
        }
        if (msg.includes('429')) {
          throw new ServiceUnavailableException(
            'Cerebras API is experiencing high traffic. Please try again in a minute.',
          );
        }
        throw new InternalServerErrorException(
          `Cerebras API error: ${msg}`,
        );
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
      application: 'Scientific laboratory research as specified in extracted documentation.',
    };
  }
}
