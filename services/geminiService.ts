
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
        svg: { type: Type.STRING, description: 'A valid, well-formed SVG string representing the diagram. The SVG should be visually clean, well-aligned, and all elements must be contained within the canvas without overlap.' }
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
    11. **Final Synthesis & Log Creation**: Compile all findings into the structured JSON output. The 'analysisLog' field must provide a detailed narrative of the entire process, explaining the 'why' behind your conclusions for each step.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: analysisSchema
    }
  });

  const jsonText = extractJson(response.text);
  return JSON.parse(jsonText) as AnalysisResult;
}


export async function generateHybridIdeas(analyses: AnalysisResult[], existingIdeas: HybridIdea[]): Promise<IdeaGenerationResult> {
    const productSummaries = analyses.map(a => `
        Product: ${a.productName}
        Strengths: ${a.strengths.join(', ')}
        Flaws: ${a.flaws.join(', ')}
        Missed Opportunities: ${a.missedOpportunities.join(', ')}
    `).join('\n\n');

    const existingIdeasPrompt = existingIdeas.length > 0
        ? `You have already generated the following ideas, so do not repeat them or generate very similar ones: ${existingIdeas.map(i => i.ideaName).join(', ')}`
        : '';

    const prompt = `
        Based on the following product analyses, generate exactly 3 novel and innovative hybrid product ideas.
        Each idea must combine the strengths of the analyzed products to address their collective flaws or missed opportunities.
        Your output MUST be a single JSON object matching the provided schema.
        The 'thinkingProcess' field must be a detailed, step-by-step narrative explaining how you combined insights to create each specific idea.

        ${productSummaries}

        ${existingIdeasPrompt}

        For each idea, provide:
        - ideaName: A catchy, descriptive name.
        - whatItIs: A concise, one-sentence explanation.
        - reasoning: A paragraph explaining the logic behind the hybrid concept, linking back to the specific strengths and flaws of the original products.
        - whyBetter: A paragraph explaining why this hybrid idea is a significant improvement over the existing products.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: ideaGenerationSchema
        }
    });
    
    const jsonText = extractJson(response.text);
    return JSON.parse(jsonText) as IdeaGenerationResult;
}

export async function generateBlueprint(analyses: AnalysisResult[], idea: HybridIdea): Promise<Blueprint> {
    const productContext = analyses.map(a => `
        - ${a.productName}: Strengths are ${a.strengths.join(', ')}. Flaws are ${a.flaws.join(', ')}.
    `).join('');

    const prompt = `
        You are an expert product manager, system architect, and business strategist.
        Create a comprehensive product blueprint for the following hybrid idea: "${idea.ideaName}".
        The idea is a hybrid of products with the following context:
        ${productContext}

        Your output MUST be a single, complete JSON object matching the provided schema.

        **CRITICAL INSTRUCTIONS FOR DIAGRAMS:**
        You will generate two SVG diagrams: a User Journey Diagram and a System Architecture Diagram.
        You MUST adhere to the following strict rules for creating these SVGs. FAILURE TO DO SO WILL RESULT IN REJECTION.

        1.  **Spatial Layout and Alignment**:
            - Boxes/Nodes must be well-spaced (maintain at least a 1-inch equivalent visible space between all elements) and strictly non-overlapping.
            - Ensure all text within boxes is fully contained and readable; boxes MUST adjust size to fit the content completely, with internal padding.
            - Align elements precisely using a grid system (e.g., center-aligned horizontally or vertically) to create clear, straight lines and columns.

        2.  **Connectors and Flow**:
            - All connecting lines, arrows, or paths must be straight and logical, adhering to a 90-degree bend rule (no diagonal or curved connectors unless explicitly requested).
            - Every connector must start from the center of the source element's side and end at the center of the target element's side. Avoid floating or unattached arrows.
            - Clearly show the direction of flow using sharp, visible arrowheads.

        3.  **Structure and Hierarchy (for layered diagrams)**:
            - Use clear horizontal dividers or distinct background layers/colors to separate different structural layers (e.g., Hardware Layer, Device Layer, Application Layer) clearly.
            - All boxes belonging to a layer must be contained fully within that layer's boundary.

        4.  **Text and Font**:
            - Use a standard, clean, non-serif font (e.g., Arial, Helvetica) and ensure text size is consistent and legible across the entire diagram.
            
        5. **General SVG rules**:
            - The SVG MUST be a single string, with proper XML/SVG syntax.
            - It should have a viewbox and be scalable.
            - Use CSS within a <style> tag for styling (fills, strokes, fonts). Define classes for consistent styling.
            - Ensure high contrast for accessibility (e.g., dark text on light backgrounds).
            - The entire diagram must fit perfectly within the SVG canvas.

        **FAILURE CONDITION**: If any box overlaps, any text is unreadable, or any arrow points to an empty space or is not perfectly aligned, the diagram is considered a failure and must be redrawn adhering strictly to these instructions.

        Now, generate the complete blueprint JSON object with the above instructions in mind.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: blueprintSchema,
             thinkingConfig: { thinkingBudget: 32768 } 
        }
    });

    const jsonText = extractJson(response.text);
    return JSON.parse(jsonText) as Blueprint;
}
