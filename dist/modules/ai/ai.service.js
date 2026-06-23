"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const cerebras_cloud_sdk_1 = __importDefault(require("@cerebras/cerebras_cloud_sdk"));
let AiService = class AiService {
    cerebras;
    constructor() {
        const apiKey = process.env.CEREBRAS_API_KEY;
        if (!apiKey) {
            console.warn('CEREBRAS_API_KEY is not set — AI extraction will fail.');
        }
        this.cerebras = new cerebras_cloud_sdk_1.default({ apiKey: apiKey ?? '' });
    }
    isUrl(input) {
        const trimmed = input.trim();
        try {
            const url = new URL(trimmed);
            return url.protocol === 'http:' || url.protocol === 'https:';
        }
        catch {
            return false;
        }
    }
    htmlToText(html) {
        let text = html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
            .replace(/<!--[\s\S]*?-->/g, '');
        text = text
            .replace(/<tr[^>]*>/gi, '\n')
            .replace(/<\/tr>/gi, '')
            .replace(/<th[^>]*>/gi, ' | ')
            .replace(/<\/th>/gi, '')
            .replace(/<td[^>]*>/gi, ' | ')
            .replace(/<\/td>/gi, '');
        text = text
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/?(p|div|h[1-6]|li|dt|dd|blockquote|article|section|main|header|footer|nav)[^>]*>/gi, '\n')
            .replace(/<\/?(ul|ol|dl|table|thead|tbody|tfoot)[^>]*>/gi, '\n');
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
        text = text.replace(/<[^>]+>/g, '');
        text = text
            .split('\n')
            .map(line => line.replace(/[ \t]+/g, ' ').trim())
            .filter(line => line.length > 0)
            .join('\n')
            .replace(/\n{3,}/g, '\n\n');
        return text.trim();
    }
    async fetchPageContent(url) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'identity',
                    'Cache-Control': 'no-cache',
                },
            });
            if (!response.ok) {
                throw new common_1.InternalServerErrorException(`Failed to fetch page: HTTP ${response.status} ${response.statusText}`);
            }
            const contentType = response.headers.get('content-type') ?? '';
            if (!contentType.includes('html') && !contentType.includes('xml') && !contentType.includes('text')) {
                throw new common_1.InternalServerErrorException(`URL did not return an HTML page (content-type: ${contentType}).`);
            }
            const html = await response.text();
            const text = this.htmlToText(html);
            if (text.length < 100) {
                throw new common_1.InternalServerErrorException('The page returned almost no readable text. It may require JavaScript rendering. Please paste the product specifications as plain text instead.');
            }
            return text;
        }
        finally {
            clearTimeout(timer);
        }
    }
    async extractProduct(input) {
        if (!process.env.CEREBRAS_API_KEY) {
            throw new common_1.InternalServerErrorException('CEREBRAS_API_KEY environment variable is not set.');
        }
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
                });
                rawText = completion.choices?.[0]?.message?.content ?? '';
                break;
            }
            catch (err) {
                const msg = err.message || '';
                if (msg.includes('429') && attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt)));
                    continue;
                }
                if (msg.includes('429')) {
                    throw new common_1.ServiceUnavailableException('Cerebras API is experiencing high traffic. Please try again in a minute.');
                }
                throw new common_1.InternalServerErrorException(`Cerebras API error: ${msg}`);
            }
        }
        if (!rawText) {
            throw new common_1.InternalServerErrorException('Cerebras returned an empty response.');
        }
        const cleaned = rawText
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        }
        catch {
            throw new common_1.InternalServerErrorException(`Could not parse AI response as JSON. Raw: ${cleaned.substring(0, 300)}`);
        }
        const specs = {};
        if (Array.isArray(parsed.specifications)) {
            parsed.specifications.forEach((s) => {
                if (s && typeof s.key === 'string' && typeof s.value === 'string') {
                    specs[s.key] = s.value;
                }
            });
        }
        return {
            name: String(parsed.name ?? 'Generated Product').trim(),
            description: String(parsed.description ?? '').trim(),
            specs: specs,
            application: 'Scientific laboratory research as specified in extracted documentation.',
        };
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AiService);
//# sourceMappingURL=ai.service.js.map