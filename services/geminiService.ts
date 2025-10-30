import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult, HybridIdea, Blueprint, IdeaGenerationResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * Extracts a JSON object from a string, even if it's wrapped in markdown code fences.
 * @param text The text to parse.
 * @returns A valid JSON string.
 * @throws {Error} if no JSON object is found.
 */
function extractJson(text: string): string {
    const match = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (match) {
        return match[0];
    }
    throw new Error("No valid JSON object found in the response.");
}


// FIX: Per @google/genai guidelines, `responseMimeType` and `responseSchema` are not allowed when using the `googleSearch` tool.
// The config has been updated accordingly, and the prompt now includes the desired JSON structure to guide the model.
export async function analyzeProduct(productName: string): Promise<AnalysisResult> {
    if (!productName.trim()) {
        throw new Error("Product name cannot be empty.");
    }
    const prompt = `Using Google Search, conduct a deep analysis of the product "${productName}".

Provide your response as a single, valid JSON object, without any surrounding text or markdown formatting. The JSON object should have the following structure:
{
  "introduction": "A string (2-3 sentences) describing what the product was designed to do.",
  "manufacturingOrigin": "A string identifying the country or company where the product was primarily designed and manufactured.",
  "strengths": ["An array of 5 strings, listing the most-praised key features."],
  "flaws": ["An array of 5 strings, listing the most common user complaints or limitations."],
  "humanImpact": "A string (2-3 sentences) describing what this product helped humans with.",
  "missedOpportunities": ["An array of 2-3 strings, detailing features or capabilities the product could have had but didn't implement."],
  "enhancementIdeas": ["An array of 2-3 strings, suggesting new features that could be added."],
  "unforeseenFlaws": ["An array of 2-3 strings, describing flaws or negative consequences the original inventor may not have considered."]
}`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map(chunk => chunk.web)
        .filter(web => web?.uri && web?.title) as { uri: string; title: string }[] || [];
    
    try {
        const jsonText = extractJson(response.text);
        const analysisData = JSON.parse(jsonText);
        return { ...analysisData, productName, sources };
    } catch (e) {
        console.error("Failed to parse analysis JSON:", e, "Raw response:", response.text);
        throw new Error("The analysis returned an unexpected format. Please try again.");
    }
}


export async function generateHybridIdeas(
    analyses: AnalysisResult[], 
    existingIdeas?: HybridIdea[]
): Promise<IdeaGenerationResult> {
    const workflow = `
[The 11-phase Reverse-Engineering Genius Systematic Inventor Workflow]

Phase 0 – Preparation & Mindset
1. Define your invention horizon: need-based, high-end entertainment, or hybrid.
2. Set risk tolerance (acceptable failure rate).
3. Set timebox per product analysis (hours/days).
4. Activate bias checkpoint: note and reject common cognitive biases (confirmation, anchoring, recency).
5. Decide the number of new concepts allowed (top 2–3).
6. Conduct weekly mindset check: Which assumption did I accept this week that could be wrong? What unrelated domain can I link to this work? What small experiment can I run immediately?

---
Phase 1 – Product Deconstruction (per product, 2–5 products)
7. Record quick facts: name, purpose, launch date, user base, platforms, tech stack, revenue model, owner.
8. Define Job-to-Be-Done (JTBD): verb phrase describing what users hire the product to do.
9. Map context → trigger → desired outcomes → emotional dimension.
10. Collect evidence: Quantitative metrics and Qualitative metrics. Rate evidence quality (1–5).
11. Build feature map (MoSCoW classification): Must / Should / Could / Won’t.
12. Identify overbuilt, underused, or bloated features; mark for removal.
13. List top 3 “missing features” or requested enhancements.
14. Scan for adjacent features / modalities (social, AI, AR, haptics).
15. Audit technical architecture: dependencies, single points of failure, tech debt, scalability.
16. Estimate engineering effort for refactor, extension, or merge.
17. Check licensing / API / IP / regulatory constraints.
18. Enumerate failure modes and edge cases.
19. Identify security, privacy, and safety risks with remediation actions.
20. Evaluate business and unit economics: revenue streams, CAC, LTV, pricing model, margin assumptions.
21. Map retention/engagement patterns and funnel leaks.
22. Identify competitive landscape: substitutes, indirect competition, defensibility.
23. Note market/tech trends and obsolescence risk.
24. Run red-flag detector: privacy, vendor lock, legal/IP, UX dark patterns, negative economics, scaling hazards, reputation risks. Estimate remediation cost.
25. Synthesize missed pluses / opportunity backlog: cross-domain, inversion, constraint exploration.

---
Phase 2 – Comparative Mapping (across all products)
26. Create feature & capability grid for all products.
27. Highlight overlaps, contradictions, unused synergies.
28. Identify recurrent themes, strengths, weaknesses, gaps.
29. Identify cross-domain bridges and opportunities not yet attempted.

---
Phase 3 – Hypothesis & Idea Generation
30. Generate hypotheses: Merge strong features, solve weaknesses with strengths, convert limitations, add new layers (sensory, social, emotional), simplify, introduce dynamic behavior.
31. Apply adjacent expansion: new audience, field, or ecosystem.
32. Generate 10–30 seed hypotheses.

---
Phase 4 – Evaluation & Prioritization
33. Preliminary filter: remove ideas violating fundamental constraints.
34. Score remaining hypotheses on: Human impact, emotional/entertainment value, technical feasibility, uniqueness, Impact-Effort Matrix.
35. Select top 2–3 hypotheses.

---
Phase 5 – Concept Definition
36. Define temporary name and tagline.
37. Define target user, context, problem/desire addressed.
38. Outline core functionality and tech stack.
39. State differentiator (what makes it unique).
40. List 3–5 “What if” questions that generated this concept.

---
Phase 6 – Prototype & Experimentation
41. Build minimal viable proof (VR demo, AI simulation, click mock).
42. Define experiment: hypothesis, success metric, duration, sample size, observation method.
43. Run user observation / testing.
44. Capture data, sentiment, surprises.

---
Phase 7 – Iteration & Pivot
45. Accept, refine, or discard concept based on signals.
46. If core idea fails but incidental value emerges → pivot.
47. Document all learnings and pivot paths.

---
Phase 8 – Post-Creation Reflection
48. Which assumptions were disproven?
49. What emerged accidentally with more value?
50. Which biases influenced design thinking?
51. What is the next micro-experiment?
52. Update inventor mental model for next cycle.

---
Phase 9 – Roadmap & Gating
53. Schedule further work only after risk assumptions are validated.
54. Set checkpoints (go/no-go based on metrics).
55. Version teardown and concept artifacts for future audits.
56. Re-run scoring matrix quarterly to detect drift.
57. Archive retired products with post-mortem lessons.
58. Enforce two-week max for initial teardown per product.

---
Phase 10 – Continuous Improvement / Meta-Level
59. Maintain decision log (merge/evolve/kill) with rationale and data.
60. Conduct monthly small experiments to avoid planning inertia.
61. Explicitly list and test riskiest assumptions first.
62. Use metacognition checks weekly: assumptions, domain links, micro-experiments.
63. Only schedule roadmap items that: Validate riskiest assumption, Improve unit economics, or Unlock strategic merger.`;

    const initialAnalysesPrompt = analyses.map((a, i) => `
**Product ${i + 1}: ${a.productName}**
- Strengths: ${a.strengths.join(', ')}
- Flaws: ${a.flaws.join(', ')}
- Missed Opportunities: ${a.missedOpportunities.join(', ')}
`).join('');

    const existingIdeasPrompt = existingIdeas && existingIdeas.length > 0 ? `
**Existing Hybrid Ideas (to build upon):**
${existingIdeas.map(idea => `
**Idea: ${idea.ideaName}**
- Concept: ${idea.whatItIs}
- Reasoning: ${idea.reasoning}
`).join('')}` : '';

    const task = existingIdeas && existingIdeas.length > 0 
        ? 'Your task is to perform a cumulative analysis on ALL of this information (the original products and the existing ideas) to generate 3 *new*, even more innovative product concepts.'
        : `Based on the following in-depth analysis of ${analyses.length} products, generate the top 3 most innovative "Hybrid Product Ideas".`;

    const prompt = `You are an expert product ideation strategist.
${task}

**Initial Product Analyses:**
${initialAnalysesPrompt}
${existingIdeasPrompt}

---

Before you create the ideas, you must rigorously and seriously follow the "11-phase Reverse-Engineering Genius Systematic Inventor Workflow" to guide your ideation process. Be extremely thorough.
${workflow}

[End of Workflow]

IMPORTANT: Your response MUST be in two parts, separated by a line containing only '---JSON START---'.

Part 1: Your 'Thinking Process'.
This should be a detailed, step-by-step monologue explaining how you applied the 11-phase workflow.
**CRITICAL FORMATTING INSTRUCTIONS:**
- Use markdown-style headers for structure.
- Use '# ' for the main title (e.g., '# Ideation Session Start').
- Use '## ' for each Phase (e.g., '## Phase 0 – Preparation & Mindset').
- Use '### ' for sub-points or key concepts within a phase.
- Use '- ' for bulleted list items.
- Write regular text as paragraphs.
- Do not use any other markdown like bold (**), italics (*), or code blocks (\`\`\`).

Part 2: The final, valid JSON array of 3 objects as described below.

The JSON object for each idea must have the following structure:
{
  "ideaName": "A creative and catchy name for the new hybrid product.",
  "whatItIs": "A clear, concise explanation of what the new product is and its primary function.",
  "reasoning": "A detailed explanation of how you came up with this idea. Specify which strengths you chose from which products to solve which flaws or missed opportunities from the other products.",
  "whyBetter": "A justification for why this new product is superior to the original products. Explain what new problems it solves."
}`;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
    });
    
    try {
        const responseText = response.text;
        const separator = '---JSON START---';
        const parts = responseText.split(separator);

        if (parts.length < 2) {
             console.warn("AI response did not contain the expected separator. Parsing entire response for JSON.");
             const ideas = JSON.parse(extractJson(responseText));
             return {
                 thinkingProcess: "The AI did not provide a thinking process in the expected format. The creative process is reflected in the generated ideas.",
                 ideas: ideas,
             };
        }

        const thinkingProcess = parts[0].trim();
        const jsonPart = parts[1];
        const ideas = JSON.parse(extractJson(jsonPart));
        
        return { thinkingProcess, ideas };

    } catch (error) {
        console.error("Failed to parse hybrid ideas response:", error, "Raw response:", response.text);
        throw new Error("Could not generate the hybrid ideas in the expected format. Please try again.");
    }
}


export async function generateBlueprint(idea: HybridIdea): Promise<Blueprint> {
    const prompt = `Based on the following product idea, create a very detailed and comprehensive business blueprint.

**Product Idea Name:** ${idea.ideaName}
**Description:** ${idea.whatItIs}
**Core Innovation:** ${idea.reasoning}

Generate a blueprint with the following sections. Be thorough and provide actionable details. The "DIY Guide" part should be especially detailed, as if explaining it to someone who wants to start building this tomorrow.

- **Value Proposition**: A single, powerful sentence explaining the unique value this product brings to its users.
- **Key Features**: A list of 5-7 core features that define the product's MVP (Minimum Viable Product).
- **Target Audience**: A specific, detailed description of the ideal customer profile, including demographics, needs, and pain points.
- **User Journey**: A brief narrative describing a user's experience from discovering the product to becoming a loyal customer.
- **Tech Stack**: Recommended technologies (languages, frameworks, platforms, APIs) to build this product.
- **Monetization Strategy**: A list of 3-5 potential ways this product could generate revenue, with a brief pro/con for each.
- **Go-To-Market Plan**: A list of 3-5 actionable strategies to launch the product and acquire the first 1,000 users.
- **DIY Guide**: A step-by-step guide for a solo founder or small team to start building this product. This should be an array of objects, where each object represents a clear, actionable step.

**IMPORTANT NOTE ON VISUALS:**
If you mention or describe any flowcharts or design diagrams (e.g., in the User Journey or DIY Guide), you must adhere to the following professional design principles. The blueprint should reflect these standards:
- **Clarity First**: Include flowcharts and design diagrams only where visual explanation adds significant clarity.
- **No Auto-Generation**: State clearly that visual assets must be created professionally or with dedicated design tools, not generated as text or code.
- **Layout Principles**: Ensure no arrows, shapes, or text overlap. Text must be neatly centered inside shapes with small, legible fonts and must never touch or cross shape borders or connecting lines. Maintain consistent spacing between all elements.
- **Standardization**: Use standard flowchart symbols and arrange flow logically (top-to-bottom or left-to-right).
- **Simplicity**: Keep diagrams clean and uncluttered for easy comprehension.

Provide your response as a single, valid JSON object, without any surrounding text or markdown formatting. The JSON object must match the structure defined in the response schema.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    valueProposition: { type: Type.STRING },
                    keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
                    targetAudience: { type: Type.STRING },
                    userJourney: { type: Type.STRING },
                    techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
                    monetizationStrategy: { type: Type.ARRAY, items: { type: Type.STRING } },
                    goToMarketPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
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
                required: ["valueProposition", "keyFeatures", "targetAudience", "userJourney", "techStack", "monetizationStrategy", "goToMarketPlan", "diyGuide"]
            }
        }
    });
    
    try {
        const jsonText = extractJson(response.text);
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Failed to parse blueprint JSON:", error, "Raw response:", response.text);
        throw new Error("Could not generate the blueprint in the expected format. Please try again.");
    }
}

export async function paraphraseText(textToParaphrase: string): Promise<string> {
    if (!textToParaphrase.trim()) {
        return textToParaphrase;
    }
    const prompt = `Please rephrase and rewrite the following text. Your goal is to alter the sentence structure, vocabulary, and overall phrasing to make it sound unique, as if written by a different author, while preserving the original meaning, information, and core concepts.

**Crucially, you MUST maintain the exact same markdown formatting:**
- Lines starting with '# ' must remain as h1 headers.
- Lines starting with '## ' must remain as h2 headers.
- Lines starting with '### ' must remain as h3 headers.
- Lines starting with '- ' must remain as bullet points.
- Paragraphs should remain as paragraphs.
- Do not add any new markdown like bold or italics.
- Do not add any introductory or concluding text like "Here is the paraphrased text:". Just return the rewritten text directly.

Here is the text to rewrite:
---
${textToParaphrase}`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });

    return response.text.trim();
}