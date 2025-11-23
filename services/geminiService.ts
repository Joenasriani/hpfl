
import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult, HybridIdea, Blueprint, IdeaGenerationResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * Extracts the first complete JSON object or array from a string.
 * This is more robust than a simple regex for handling cases where the API
 * might return multiple JSON objects or other trailing text.
 * @param text The text to parse.
 * @returns A string containing the first valid JSON object.
 * @throws {Error} if no valid JSON object is found.
 */
function extractJson(text: string): string {
    const startIndex = text.indexOf('{');
    const startBracket = text.indexOf('[');

    if (startIndex === -1 && startBracket === -1) {
        throw new Error("No valid JSON object found in the response.");
    }

    let startPos = -1;
    if (startIndex !== -1 && startBracket !== -1) {
        startPos = Math.min(startIndex, startBracket);
    } else if (startIndex !== -1) {
        startPos = startIndex;
    } else {
        startPos = startBracket;
    }

    const openChar = text[startPos];
    const closeChar = openChar === '{' ? '}' : ']';
    let balance = 1;
    let inString = false;
    let escape = false;

    for (let i = startPos + 1; i < text.length; i++) {
        const char = text[i];
        
        if (escape) {
            escape = false;
            continue;
        }

        if (char === '\\') {
            escape = true;
            continue;
        }
        
        if (char === '"') {
            inString = !inString;
        }
        
        if (inString) {
            continue;
        }

        if (char === openChar) {
            balance++;
        } else if (char === closeChar) {
            balance--;
        }

        if (balance === 0) {
            return text.substring(startPos, i + 1);
        }
    }

    throw new Error("Could not find a complete JSON object in the response.");
}


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
    analysisLog: { type: Type.STRING, description: 'A detailed log summarizing the step-by-step execution of the AI CSL analysis protocol, showing the findings for each step.' },
  },
  required: [
    'productName',
    'introduction',
    'manufacturingOrigin',
    'strengths',
    'flaws',
    'humanImpact',
    'missedOpportunities',
    'enhancementIdeas',
    'unforeseenFlaws',
    'analysisLog'
  ]
};

const ideaGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        thinkingProcess: { type: Type.STRING, description: "A detailed log of the AI's step-by-step thinking process for generating the ideas." },
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
                required: ['ideaName', 'whatItIs', 'reasoning', 'whyBetter']
            }
        }
    },
    required: ['thinkingProcess', 'ideas']
};

const diagramSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        type: { type: Type.STRING, enum: ['flowchart', 'architecture', 'userJourney'] },
        svg: { type: Type.STRING, description: 'A valid, well-formed SVG string representing the diagram. The SVG should be visually clean, well-aligned, and all elements must be contained within the canvas without overlap. It MUST follow the critical diagram generation rules.' }
    },
    required: ['title', 'type', 'svg']
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
            required: ['problemStatement', 'proposedSolution', 'valueProposition']
        },
        marketAnalysis: {
            type: Type.OBJECT,
            properties: {
                targetAudience: { type: Type.STRING },
                marketSize: { type: Type.STRING },
                competitiveLandscape: { type: Type.STRING }
            },
            required: ['targetAudience', 'marketSize', 'competitiveLandscape']
        },
        productSpecification: {
            type: Type.OBJECT,
            properties: {
                keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
                userJourneyDiagram: diagramSchema,
                techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
                architectureDiagram: diagramSchema
            },
            required: ['keyFeatures', 'userJourneyDiagram', 'techStack', 'architectureDiagram']
        },
        businessStrategy: {
            type: Type.OBJECT,
            properties: {
                monetizationStrategy: { type: Type.ARRAY, items: { type: Type.STRING } },
                goToMarketPlan: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['monetizationStrategy', 'goToMarketPlan']
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
                        required: ['step', 'title', 'description', 'actionableItems']
                    }
                }
            },
            required: ['diyGuide']
        },
        conclusion: { type: Type.STRING }
    },
    required: [
        'title',
        'abstract',
        'introduction',
        'marketAnalysis',
        'productSpecification',
        'businessStrategy',
        'implementationRoadmap',
        'conclusion'
    ]
};

export async function analyzeProduct(productName: string): Promise<AnalysisResult> {
  const prompt = `
    Analyze the product: "${productName}".

    Execute the following 11-phase AI CSL (Creative Strategy Log) analysis protocol.
    Your output MUST be a single JSON object matching the provided schema.
    Your analysisLog MUST be a detailed, step-by-step narrative of your process, formatted with markdown for clarity.

    ## AI CSL Analysis Protocol ##

    1.  **Product Identification & Introduction**: Briefly introduce the product, its primary function, and its intended user base.
    2.  **Manufacturing & Origin Analysis**: Research its manufacturing process, materials used, and country of origin.
    3.  **Core Strengths Evaluation**: Identify and list its key advantages and what it does exceptionally well.
    4.  **Critical Flaws & Weaknesses**: Identify and list its most significant drawbacks, limitations, and common user complaints.
    5.  **Human Impact & User Experience**: Analyze its effect on users' lives, both positive and negative. How does it make them feel? What problems does it truly solve?
    6.  **Missed Opportunities & Market Gaps**: What potential features or markets has this product overlooked?
    7.  **Radical Enhancement Ideas**: Brainstorm and list creative, out-of-the-box ideas to improve the product.
    8.  **Unforeseen Flaws & Hidden Problems**: Dig deeper to uncover less obvious issues that might emerge with long-term use or in specific scenarios.
    9.  **Synergy Search (Internal)**: How could features from this product be combined or enhanced?
    10. **Competitor Cross-Examination**: Briefly analyze 1-2 key competitors to see what they do better or worse.
    11. **Final Synthesis & Log Creation**: Compile all findings into the 'analysisLog' field. Structure the log with clear headings for each of the 10 preceding steps, detailing your findings for each one.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: analysisSchema,
    },
  });
  
  try {
    const jsonText = extractJson(response.text || "");
    return JSON.parse(jsonText) as AnalysisResult;
  } catch(e) {
    console.error("Failed to parse analysis JSON:", e);
    console.error("Raw Gemini Response:", response.text);
    throw new Error("The AI returned an invalid analysis format. Please try again.");
  }
}

export async function generateHybridIdeas(analyses: AnalysisResult[], existingIdeas: HybridIdea[]): Promise<IdeaGenerationResult> {
    const prompt = `
    You are a world-class product innovator and divergent thinker. Your task is to synthesize the findings from multiple product analyses to generate 2 novel hybrid product ideas.

    **Product Analyses Context**:
    ${JSON.stringify(analyses, null, 2)}
    
    ${existingIdeas.length > 0 ? `**Existing Ideas (Do not repeat or create similar concepts)**:
    ${JSON.stringify(existingIdeas, null, 2)}` : ''}

    **Your Mission**:
    1.  **Synthesize**: Deeply analyze the STRENGTHS of one product and the FLAWS/MISSED OPPORTUNITIES of the others.
    2.  **Hybridize**: Generate 2 completely new product concepts that combine the best features of the analyzed products to solve the identified problems in a unique way.
    3.  **Articulate**: For each idea, clearly explain what it is, your reasoning for the hybrid combination, and why this new product is fundamentally better than its predecessors.
    4.  **Log Your Process**: Detail your step-by-step thinking process in the 'thinkingProcess' field. Explain how you connected the dots between the different product analyses to arrive at your conclusions.
    
    Your output MUST be a single JSON object that strictly adheres to the provided schema.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: ideaGenerationSchema,
        },
    });

    try {
        const jsonText = extractJson(response.text || "");
        return JSON.parse(jsonText) as IdeaGenerationResult;
    } catch(e) {
        console.error("Failed to parse idea generation JSON:", e);
        console.error("Raw Gemini Response:", response.text);
        throw new Error("The AI returned an invalid idea format. Please try again.");
    }
}


export async function generateBlueprint(analyses: AnalysisResult[], idea: HybridIdea): Promise<Blueprint> {
    const prompt = `
    You are a Senior Product Manager and Systems Architect. Your task is to create a detailed product blueprint for the following hybrid product idea.

    **Product Analyses Context**:
    ${JSON.stringify(analyses, null, 2)}

    **Hybrid Idea to Blueprint**:
    ${JSON.stringify(idea, null, 2)}

    **Instructions**:
    Flesh out the idea into a comprehensive, actionable blueprint. Be specific, realistic, and strategic.

    **Diagram Generation Rules**:
    CRITICAL RULE: For ALL SVG diagrams (User Journey and Architecture), you MUST ONLY use basic, empty shapes (e.g., rectangles, circles, diamonds with transparent or white fills and black borders), solid black arrows for connectors, and clear, legible black text.
    - DO NOT use any icons, colors, gradients, shadows, complex illustrations, or filled shapes.
    - Ensure all elements are well-spaced, do not overlap, and are easily readable.
    - The design MUST be a minimalist, professional, black-and-white wireframe or flowchart style.
    - The SVG output must be a single, valid SVG string.
    - All text must be clearly visible and not obscured by other elements.

    Based on these rules, generate a comprehensive blueprint. Your output must be a single, valid JSON object that strictly adheres to the provided schema.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: blueprintSchema,
        },
    });

    try {
        const jsonText = extractJson(response.text || "");
        return JSON.parse(jsonText) as Blueprint;
    } catch(e) {
        console.error("Failed to parse blueprint JSON:", e);
        console.error("Raw Gemini Response:", response.text);
        throw new Error("The AI returned an invalid blueprint format. Please try again.");
    }
}
