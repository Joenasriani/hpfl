import { GoogleGenAI, Type } from "@google/genai";

type Req = {
  method?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};

type Res = {
  status: (code: number) => Res;
  json: (body: unknown) => unknown;
};

type RateEntry = {
  count: number;
  resetAt: number;
};

const MODEL = "gemini-2.5-pro";
const MAX_PRODUCT_NAME = 300;
const MAX_CONTEXT_BYTES = 120_000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 12;

const globalRateState = globalThis as typeof globalThis & {
  __hpflGeminiRateLimit?: Map<string, RateEntry>;
};
const rateLimitStore = globalRateState.__hpflGeminiRateLimit ?? new Map<string, RateEntry>();
globalRateState.__hpflGeminiRateLimit = rateLimitStore;

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    productName: { type: Type.STRING },
    introduction: { type: Type.STRING },
    manufacturingOrigin: { type: Type.STRING },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    flaws: { type: Type.ARRAY, items: { type: Type.STRING } },
    humanImpact: { type: Type.STRING },
    missedOpportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
    enhancementIdeas: { type: Type.ARRAY, items: { type: Type.STRING } },
    unforeseenFlaws: { type: Type.ARRAY, items: { type: Type.STRING } },
    analysisLog: {
      type: Type.STRING,
      description: "A concise evidence-status summary of the analysis. Distinguish supplied facts, model inference, and information that requires external verification."
    }
  },
  required: [
    "productName",
    "introduction",
    "manufacturingOrigin",
    "strengths",
    "flaws",
    "humanImpact",
    "missedOpportunities",
    "enhancementIdeas",
    "unforeseenFlaws",
    "analysisLog"
  ]
};

const ideaGenerationSchema = {
  type: Type.OBJECT,
  properties: {
    thinkingProcess: {
      type: Type.STRING,
      description: "A concise decision summary describing the product attributes compared, assumptions used, and why the resulting combinations were selected. Do not claim hidden internal reasoning."
    },
    ideas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ideaName: { type: Type.STRING },
          whatItIs: { type: Type.STRING },
          reasoning: { type: Type.STRING },
          whyBetter: { type: Type.STRING }
        },
        required: ["ideaName", "whatItIs", "reasoning", "whyBetter"]
      }
    }
  },
  required: ["thinkingProcess", "ideas"]
};

const diagramSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    type: { type: Type.STRING, enum: ["flowchart", "architecture", "userJourney"] },
    svg: {
      type: Type.STRING,
      description: "A valid SVG string using only simple black-and-white diagram shapes, connectors and readable text."
    }
  },
  required: ["title", "type", "svg"]
};

const blueprintSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    abstract: { type: Type.STRING },
    introduction: {
      type: Type.OBJECT,
      properties: {
        problemStatement: { type: Type.STRING },
        proposedSolution: { type: Type.STRING },
        valueProposition: { type: Type.STRING }
      },
      required: ["problemStatement", "proposedSolution", "valueProposition"]
    },
    marketAnalysis: {
      type: Type.OBJECT,
      properties: {
        targetAudience: { type: Type.STRING },
        marketSize: { type: Type.STRING },
        competitiveLandscape: { type: Type.STRING }
      },
      required: ["targetAudience", "marketSize", "competitiveLandscape"]
    },
    productSpecification: {
      type: Type.OBJECT,
      properties: {
        keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
        userJourneyDiagram: diagramSchema,
        techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
        architectureDiagram: diagramSchema
      },
      required: ["keyFeatures", "userJourneyDiagram", "techStack", "architectureDiagram"]
    },
    businessStrategy: {
      type: Type.OBJECT,
      properties: {
        monetizationStrategy: { type: Type.ARRAY, items: { type: Type.STRING } },
        goToMarketPlan: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["monetizationStrategy", "goToMarketPlan"]
    },
    implementationRoadmap: {
      type: Type.OBJECT,
      properties: {
        diyGuide: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              step: { type: Type.INTEGER },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              actionableItems: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["step", "title", "description", "actionableItems"]
          }
        }
      },
      required: ["diyGuide"]
    },
    conclusion: { type: Type.STRING }
  },
  required: [
    "title",
    "abstract",
    "introduction",
    "marketAnalysis",
    "productSpecification",
    "businessStrategy",
    "implementationRoadmap",
    "conclusion"
  ]
};

function firstHeader(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function getClientIp(req: Req): string {
  const forwarded = firstHeader(req.headers?.["x-forwarded-for"]);
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = firstHeader(req.headers?.["x-real-ip"]);
  return realIp || req.socket?.remoteAddress || "unknown";
}

function rateLimitExceeded(req: Req): boolean {
  const now = Date.now();
  const key = getClientIp(req);
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    current.count += 1;
    if (current.count > RATE_LIMIT_MAX_REQUESTS) return true;
  }

  if (rateLimitStore.size > 5000) {
    for (const [ip, entry] of rateLimitStore) {
      if (entry.resetAt <= now) rateLimitStore.delete(ip);
    }
  }

  return false;
}

function extractJson(text: string): string {
  const objectStart = text.indexOf("{");
  const arrayStart = text.indexOf("[");

  if (objectStart === -1 && arrayStart === -1) {
    throw new Error("Provider returned no JSON payload.");
  }

  const start = objectStart === -1
    ? arrayStart
    : arrayStart === -1
      ? objectStart
      : Math.min(objectStart, arrayStart);

  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 1;
  let inString = false;
  let escaped = false;

  for (let i = start + 1; i < text.length; i += 1) {
    const char = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') inString = !inString;
    if (inString) continue;
    if (char === open) depth += 1;
    if (char === close) depth -= 1;
    if (depth === 0) return text.slice(start, i + 1);
  }

  throw new Error("Provider returned incomplete JSON.");
}

function withinContextLimit(value: unknown): boolean {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8") <= MAX_CONTEXT_BYTES;
  } catch {
    return false;
  }
}

async function generate(ai: GoogleGenAI, prompt: string, schema: unknown) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema as any
    }
  });

  const text = response.text || "";
  return JSON.parse(extractJson(text));
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (rateLimitExceeded(req)) {
    return res.status(429).json({ error: "Too many AI requests. Please try again later." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "AI provider is not configured." });
  }

  const body = req.body ?? {};
  const action = typeof body.action === "string" ? body.action : "";
  const ai = new GoogleGenAI({ apiKey });

  try {
    if (action === "analyzeProduct") {
      const productName = typeof body.productName === "string" ? body.productName.trim() : "";
      if (!productName || productName.length > MAX_PRODUCT_NAME) {
        return res.status(400).json({ error: "A valid product name is required." });
      }

      const prompt = `
Analyze the product: "${productName}".

Execute the following 11-phase Creative Strategy Log analysis protocol and return only JSON matching the response schema.

Evidence discipline:
- Do not claim that you browsed, researched current sources, or verified external facts unless source material was supplied in this request.
- Treat specific market sizes, manufacturing claims, competitor facts, dates, pricing, and other externally verifiable facts as requiring independent verification when they are not established by the supplied input.
- Separate direct product description from inference and uncertainty.
- Do not invent citations, sources, measurements, or test results.

Protocol:
1. Product identification and introduction.
2. Manufacturing and origin: state what is known versus what requires verification.
3. Core strengths.
4. Critical flaws and limitations.
5. Human impact and user experience.
6. Missed opportunities and market gaps.
7. Enhancement ideas.
8. Less-obvious failure modes or risks.
9. Internal feature synergies.
10. Competitor comparison, explicitly marking unverified factual claims.
11. Final evidence-status summary in analysisLog.
`;

      return res.status(200).json({ data: await generate(ai, prompt, analysisSchema) });
    }

    if (action === "generateHybridIdeas") {
      const analyses = body.analyses;
      const existingIdeas = body.existingIdeas;
      if (!Array.isArray(analyses) || !Array.isArray(existingIdeas) || !withinContextLimit({ analyses, existingIdeas })) {
        return res.status(400).json({ error: "Invalid or oversized idea-generation context." });
      }

      const prompt = `
Generate exactly 2 distinct hybrid product ideas from the supplied product analyses.

Product analyses:
${JSON.stringify(analyses, null, 2)}

Existing ideas that must not be repeated:
${JSON.stringify(existingIdeas, null, 2)}

Requirements:
- Compare useful strengths, flaws, constraints, and missed opportunities across the supplied products.
- Combine attributes only where the combination has a coherent use case.
- Do not invent factual validation, market evidence, user research, technical feasibility tests, or commercial proof.
- In thinkingProcess, provide a concise decision summary: what attributes were compared, what assumptions were made, and why each combination was selected. Do not present hidden chain-of-thought.
- Return only JSON matching the response schema.
`;

      return res.status(200).json({ data: await generate(ai, prompt, ideaGenerationSchema) });
    }

    if (action === "generateBlueprint") {
      const analyses = body.analyses;
      const idea = body.idea;
      if (!Array.isArray(analyses) || !idea || typeof idea !== "object" || !withinContextLimit({ analyses, idea })) {
        return res.status(400).json({ error: "Invalid or oversized blueprint context." });
      }

      const prompt = `
Create an actionable product blueprint for the supplied hybrid idea using the supplied analyses as context.

Product analyses:
${JSON.stringify(analyses, null, 2)}

Hybrid idea:
${JSON.stringify(idea, null, 2)}

Evidence discipline:
- Distinguish design proposals from verified facts.
- Do not invent market-size evidence, competitor facts, user research, technical tests, costs, legal clearance, or commercial validation.
- When a market-size figure cannot be established from supplied evidence, say that external market research is required rather than fabricating a number.

Diagram rules:
- Use only basic empty rectangles, circles or diamonds with white/transparent fills and black borders.
- Use solid black arrows, legible black text, and generous spacing.
- No icons, colors, gradients, shadows or decorative illustrations.
- Produce valid standalone SVG strings without overlapping elements.

Return only JSON matching the response schema.
`;

      return res.status(200).json({ data: await generate(ai, prompt, blueprintSchema) });
    }

    return res.status(400).json({ error: "Unknown action." });
  } catch (error) {
    console.error("HPFL Gemini request failed", error);
    return res.status(502).json({ error: "AI generation failed. Please try again." });
  }
}
