import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult, TrioIdea, Blueprint, IdeaGenerationResult } from '../types';

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


export async function generateTrioHybridIdeas(analysis1: AnalysisResult, analysis2: AnalysisResult, analysis3: AnalysisResult): Promise<IdeaGenerationResult> {
    const prompt = `Based on the following in-depth analysis of three products, generate the top 3 most innovative "Hybrid Product Ideas".

**Product 1: ${analysis1.productName}**
- Strengths: ${analysis1.strengths.join(', ')}
- Flaws: ${analysis1.flaws.join(', ')}

**Product 2: ${analysis2.productName}**
- Strengths: ${analysis2.strengths.join(', ')}
- Flaws: ${analysis2.flaws.join(', ')}

**Product 3: ${analysis3.productName}**
- Strengths: ${analysis3.strengths.join(', ')}
- Flaws: ${analysis3.flaws.join(', ')}

Before you create the ideas, you must use the following thinking framework to guide your ideation process:

[The 7-Category Invention Framework]

- Foundational Mindset
Ask "Why?" and "What if?"
Be insatiably curious.
Find the friction and the unspoken need.
Observe how people really behaved and said/wrote/reviewed about the product.
Break the problem down to its first principles.
Connect the unconnected.
Treat failure as data.

- Flaw, Con, & Gap Analysis
Focus on the flaws: What are the biggest cons and user annoyances?
Build the "anti-product": What new product exists only to solve P1's biggest con?
Identify the single biggest shared flaw across all products.
Generate a "fix" for this significant gap.
Can a strength from Product 1 be used to solve a flaw in Product 2?
Turn a flaw into a feature: Can that "con" be repositioned as a "pro" in a new context?
What's the easiest user annoyance to solve right now?

- Hybrid & Feature Combination
Combine the core function of P1 and P2.
Build a "Best Parts" product (P1's top feature + P2's + P3's).
What if P1's sensor meets P3's algorithm?
Create the "1 + 1 = 3" hybrid

- Market & Context Shift
Who is the opposite of the current user?
Design for this new, unmet audience.
Shift the context: from "leisure" to "productivity"? Or "home" to "industrial"?
Unbundle: Can one popular feature become its own cheap, standalone product?

- Ecosystem & Enhancement
What single product enhances P1, P2, and P3 simultaneously?
Design an accessory, a universal adapter, or a software dashboard.

- Iterative Generation Loop
Generate the first batch (Ideas 1, 2, 3).
Generate the next batch.
Treat all prior ideas as new ingredients.
Feed all outputs back in as new inputs.
Analyze the entire pool (Originals + Ideas 1-6).
Combine the combinations.
Cross-pollinate: What if Idea 2 and Idea 5 merge?
Stack ideas to build new layers of complexity.
Prototype the best hybrid.
Test. Learn. Repeat the loop.

The 'Genius' Layer: Advanced & Asymmetrical Thinking
Anticipate the Next Problem.
Find the 'Wow' Moment.
Apply the Genius of Subtraction.
Make the Product Invisible.
Invent the Business Model.
Design for a Specific Emotion.
Find the Second-Order Effect.
Ask: Is This a Product or a Platform?
What is the Product's Story?

[End of Framework]

IMPORTANT: Your response MUST be in two parts, separated by a line containing only '---JSON START---'.
Part 1: Your 'Thinking Process'. This should be a detailed, step-by-step monologue explaining how you applied the 7-Category Invention Framework. Be explicit about which product flaws, strengths, and opportunities you are considering.
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
        console.error("Failed to parse trio ideas response:", error, "Raw response:", response.text);
        throw new Error("Could not generate the hybrid ideas in the expected format. Please try again.");
    }
}


export async function generateBlueprint(idea: TrioIdea): Promise<Blueprint> {
    const prompt = `Based on the following product idea, create a concise business blueprint.

**Product Idea Name:** ${idea.ideaName}
**Description:** ${idea.whatItIs}
**Core Innovation:** ${idea.reasoning}

Generate a blueprint with the following sections:
- Key Features: A list of 3-5 core features that define the product's MVP (Minimum Viable Product).
- Target Audience: A brief but specific description of the ideal customer for this product.
- Monetization Strategy: A list of 2-3 potential ways this product could generate revenue.

Provide your response as a single, valid JSON object, without any surrounding text or markdown formatting. The JSON object must have the following structure:
{
  "keyFeatures": ["Array of strings"],
  "targetAudience": "A single string",
  "monetizationStrategy": ["Array of strings"]
}`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
                    targetAudience: { type: Type.STRING },
                    monetizationStrategy: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["keyFeatures", "targetAudience", "monetizationStrategy"]
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

export async function generateMoreIdeas(
    analyses: AnalysisResult[], 
    existingIdeas: TrioIdea[]
): Promise<IdeaGenerationResult> {
    const prompt = `You are an expert product ideation strategist. You will be given an analysis of 3 initial products and a list of hybrid ideas already generated from them. Your task is to perform a cumulative analysis on ALL of this information (the original products and the existing ideas) to generate 3 *new*, even more innovative product concepts.

**Initial Product Analyses:**
${analyses.map(a => `
**Product: ${a.productName}**
- Strengths: ${a.strengths.join(', ')}
- Flaws: ${a.flaws.join(', ')}
`).join('')}

**Existing Hybrid Ideas:**
${existingIdeas.map(idea => `
**Idea: ${idea.ideaName}**
- Concept: ${idea.whatItIs}
- Reasoning: ${idea.reasoning}
`).join('')}

---

To generate these new ideas, you must use the following thinking framework to guide your ideation process, paying special attention to the 'Iterative Generation Loop' and 'Genius Layer' since you are building on existing concepts:

[The 7-Category Invention Framework]

- Foundational Mindset
Ask "Why?" and "What if?"
Be insatiably curious.
Find the friction and the unspoken need.
Observe how people really behaved and said/wrote/reviewed about the product.
Break the problem down to its first principles.
Connect the unconnected.
Treat failure as data.

- Flaw, Con, & Gap Analysis
Focus on the flaws: What are the biggest cons and user annoyances?
Build the "anti-product": What new product exists only to solve P1's biggest con?
Identify the single biggest shared flaw across all products.
Generate a "fix" for this significant gap.
Can a strength from Product 1 be used to solve a flaw in Product 2?
Turn a flaw into a feature: Can that "con" be repositioned as a "pro" in a new context?
What's the easiest user annoyance to solve right now?

- Hybrid & Feature Combination
Combine the core function of P1 and P2.
Build a "Best Parts" product (P1's top feature + P2's + P3's).
What if P1's sensor meets P3's algorithm?
Create the "1 + 1 = 3" hybrid

- Market & Context Shift
Who is the opposite of the current user?
Design for this new, unmet audience.
Shift the context: from "leisure" to "productivity"? Or "home" to "industrial"?
Unbundle: Can one popular feature become its own cheap, standalone product?

- Ecosystem & Enhancement
What single product enhances P1, P2, and P3 simultaneously?
Design an accessory, a universal adapter, or a software dashboard.

- Iterative Generation Loop
Generate the first batch (Ideas 1, 2, 3).
Generate the next batch.
Treat all prior ideas as new ingredients.
Feed all outputs back in as new inputs.
Analyze the entire pool (Originals + Ideas 1-6).
Combine the combinations.
Cross-pollinate: What if Idea 2 and Idea 5 merge?
Stack ideas to build new layers of complexity.
Prototype the best hybrid.
Test. Learn. Repeat the loop.

The 'Genius' Layer: Advanced & Asymmetrical Thinking
Anticipate the Next Problem.
Find the 'Wow' Moment.
Apply the Genius of Subtraction.
Make the Product Invisible.
Invent the Business Model.
Design for a Specific Emotion.
Find the Second-Order Effect.
Ask: Is This a Product or a Platform?
What is the Product's Story?

[End of Framework]

IMPORTANT: Your response MUST be in two parts, separated by a line containing only '---JSON START---'.
Part 1: Your 'Thinking Process'. This should be a detailed, step-by-step monologue explaining how you applied the 7-Category Invention Framework by synthesizing information from the original products and previously generated ideas.
Part 2: The final, valid JSON array of 3 objects as described below.

The JSON object for each idea must have the following structure:
{
  "ideaName": "A creative and catchy name for the new hybrid product.",
  "whatItIs": "A clear, concise explanation of what the new product is and its primary function.",
  "reasoning": "A detailed explanation of how you came up with this idea by synthesizing information from the original products and previously generated ideas.",
  "whyBetter": "A justification for why this new product is a significant step forward. Explain what new problems it solves or what unique value it offers compared to everything analyzed so far."
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
        console.error("Failed to parse more ideas response:", error, "Raw response:", response.text);
        throw new Error("Could not generate more ideas in the expected format. Please try again.");
    }
}