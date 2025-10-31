
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
    'productName', 'introduction', 'manufacturingOrigin', 'strengths', 'flaws',
    'humanImpact', 'missedOpportunities', 'enhancementIdeas', 'unforeseenFlaws', 'analysisLog'
  ],
};

const ideaGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        thinkingProcess: { type: Type.STRING },
        ideas: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    ideaName: { type: Type.STRING },
                    whatItIs: { type: Type.STRING },
                    reasoning: { type: Type.STRING },
                    whyBetter: { type: Type.STRING },
                },
                required: ['ideaName', 'whatItIs', 'reasoning', 'whyBetter'],
            },
        },
    },
    required: ['thinkingProcess', 'ideas'],
};

const diagramSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        type: { type: Type.STRING, enum: ['flowchart', 'architecture', 'userJourney'] },
        svg: { type: Type.STRING, description: 'A valid, well-formed SVG string representing the diagram. Adheres to strict design rules.' }
    },
    required: ['title', 'type', 'svg']
};

const blueprintSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The main title of the research paper-style blueprint." },
    abstract: { type: Type.STRING, description: "A concise summary of the entire blueprint." },
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
            marketSize: { type: Type.STRING, description: "An estimation of the market size and potential." },
            competitiveLandscape: { type: Type.STRING, description: "Analysis of competitors." }
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
                  actionableItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['step', 'title', 'description', 'actionableItems'],
              },
            }
        },
        required: ['diyGuide']
    },
    conclusion: { type: Type.STRING, description: "A concluding summary of the product's potential and next steps." }
  },
  required: [
    'title', 'abstract', 'introduction', 'marketAnalysis', 'productSpecification',
    'businessStrategy', 'implementationRoadmap', 'conclusion'
  ],
};


const analysisPrompt = `You are an expert product analyst. Your goal is to conduct a comprehensive analysis of the product: "{productName}".
Based on your knowledge, provide a detailed analysis covering the following aspects. You must populate all fields in the provided JSON schema.

- **productName**: The official name of the product.
- **introduction**: A detailed introduction to the product. Explain what it is, its core purpose, and the primary problem it solves for its users.
- **manufacturingOrigin**: Describe who invented or developed the product, the company responsible, and the year it was released.
- **strengths**: List the key strengths of the product. Consider its design, functionality, user experience, and market position. Provide at least 3 distinct points.
- **flaws**: List the significant weaknesses or flaws of the product. Consider technical limitations, usability issues, and common user complaints. Provide at least 3 distinct points.
- **humanImpact**: Analyze the broader impact of the product on users and society. Discuss how it has changed behaviors, its cultural significance, and any unintended uses.
- **missedOpportunities**: Identify potential features or design choices that were overlooked during its development. What could have made the product even better?
- **enhancementIdeas**: Suggest specific, practical ideas for improving the current product. These should be enhancements, not entirely new products.
- **unforeseenFlaws**: Discuss any negative externalities or long-term problems that have emerged since the product's release (e.g., environmental, ethical, social issues).
- **analysisLog**: Provide a concise, step-by-step summary of your analysis process for our records. For example: "Step 1: Researched '{productName}' origin and core function. Step 2: Analyzed user reviews and technical specs to identify strengths and weaknesses. Step 3: Evaluated its broader human impact and identified missed opportunities. Step 4: Synthesized findings into enhancement ideas and unforeseen flaws."

Respond ONLY with a valid JSON object matching the provided schema.
`;

export async function analyzeProduct(productName: string, logCallback?: (message: string) => void): Promise<AnalysisResult> {
  logCallback?.(`Analyzing "${productName}": Initializing analysis.`);
  try {
    logCallback?.(`Analyzing "${productName}": Querying Gemini Pro...`);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [{ parts: [{ text: analysisPrompt.replace(/{productName}/g, productName) }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: analysisSchema,
      },
    });

    logCallback?.(`Analyzing "${productName}": Received response. Parsing JSON.`);
    const jsonText = extractJson(response.text);
    const parsed = JSON.parse(jsonText);
    
    logCallback?.(`Analyzing "${productName}": Analysis complete.`);
    
    return { ...parsed, productName };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    logCallback?.(`ERROR analyzing "${productName}": ${errorMessage}`);
    console.error("Failed to parse analysis JSON:", error);
    if (error instanceof Error && (error as any).response) {
      console.error("Raw response:", (error as any).response?.text);
    }
    throw new Error(`Failed to analyze ${productName}. The request may have timed out due to complexity. Please try again or simplify the product names.`);
  }
}

export async function generateHybridIdeas(analyses: AnalysisResult[], existingIdeas: HybridIdea[] = [], logCallback?: (message: string) => void): Promise<IdeaGenerationResult> {
    logCallback?.('Generating Ideas: Compiling product analyses.');
    const analysesText = analyses.map(a => `
        Product: ${a.productName}
        Strengths: ${a.strengths.join(', ')}
        Flaws & Weaknesses: ${a.flaws.join(', ')}
        Unforeseen (Latent) Flaws: ${a.unforeseenFlaws.join(', ')}
        User Behavior & Human Impact: ${a.humanImpact}
        Design Logic & Missed Opportunities: ${a.missedOpportunities.join(', ')}
    `).join('\n---\n');

    const existingIdeasText = existingIdeas.length > 0 ? `
        ---
        PREVIOUSLY GENERATED IDEAS (DO NOT REPEAT):
        ${existingIdeas.map(idea => `- ${idea.ideaName}: ${idea.whatItIs}`).join('\n')}
    ` : '';
    
    const prompt = `
        You are an autonomous AI product strategist. Your goal is to use the provided Phase 1 analysis to generate the top 3 feasible, socially impactful, and market-ready product ideas.
        
        You must follow the instructions below precisely. Your internal process should follow the AI Creative Strategy Log (AI CSL) protocol. Your final output must be a single JSON object conforming to the provided schema.
        
        **Analysis Summary:**
        ${analysesText}
        
        ${existingIdeasText}
        
        ---
        **AI CSL Idea Generation Protocol (Phase 2)**
        
        **Goal:** Using Phase 1 analysis, autonomously generate the top 3 feasible, socially impactful, and market-ready product ideas, with full traceability in AI CSL.
        
        **Step-by-Step Instructions**
        
        **Step 1: Retrieve Phase 1 Insights**
        - Automatically retrieve all insights from the Phase 1 Analysis Summary provided above.
        - Extract insights from: Strengths, weaknesses, latent flaws, emergent uses and actual user behaviors, design patterns, trade-offs, heuristics, contextual constraints, market signals.
        - Record all extracted insights in your internal AI CSL with source references.
        
        **Step 2: Identify Recombination Opportunities**
        - Compare products using feature-matrix logic:
          - Flaw from Product A + Solution from Product B
          - Emergent Use from Product A + Technology from Product B
          - Trade-off from Product A + Inverse Trade-off from Product B
          - Constraint in Product A + Capability in Product B
          - Component from Product A + UX Principle from Product B/C
        - Log all recombination patterns in your internal AI CSL with traceability.
        
        **Step 3: Formulate Candidate Concepts**
        - For each recombination, generate at least 3 candidate product ideas.
        - Each candidate must include: Name / working title, Core concept / principle, Derived features or components (traceable to analysis), Target users / context, Humanitarian / societal impact, Market relevance / adoption potential, Novelty / differentiation, Feasibility / scalability, Potential challenges or risks.
        - Record all candidate ideas in your internal AI CSL.
        
        **Step 4: Score Candidate Ideas**
        - Score each candidate on:
          - Technical Feasibility (1–10)
          - Novelty / Differentiation (1–10)
          - Humanitarian / Social Impact (1–10)
          - Market Viability (1–10)
          - Sustainability / Environmental Impact (1–10)
          - Prototype Cost & Simplicity (1–10)
        - Provide rationale for each score and log in your internal AI CSL.
        
        **Step 5: Select Top 3 Ideas**
        - Select the 3 highest-scoring concepts as final ideas.
        - Ensure: They are technically feasible, they address current human needs or market gaps, and they have market adoption and societal benefit potential.
        - Record final selection, reasoning, and linked Phase 1 insights in your internal AI CSL.
        
        **Step 6: Prototype / Verification Planning (Internal)**
        - For each of the top 3 ideas, define a minimal experiment or prototype outline.
        - Log all prototype plans and verification steps in your internal AI CSL.
        
        ---
        **Final Output Generation Instructions:**
        
        Based on your comprehensive CSL process, populate the provided JSON schema. Your internal log is for your process; the output MUST be this JSON.
        
        - **thinkingProcess**: Provide a detailed narrative of your process. Describe how you executed Steps 1-5 of the protocol: what insights you extracted, what recombination opportunities you found, how you formulated and scored candidates, and why you selected the final 3 ideas. This is a summary of your internal AI CSL for this phase.
        - **ideas**: Provide an array with exactly 3 new hybrid ideas, synthesized from your CSL.
          - **ideaName**: The name/working title from Step 3.
          - **whatItIs**: The core concept and key derived features from Step 3.
          - **reasoning**: Explain the core recombination logic from Step 2 that led to this idea and the reasoning for its selection from Step 5.
          - **whyBetter**: Summarize its high scores from Step 4, focusing on novelty, market viability, and its humanitarian/social impact.
        
        Respond ONLY with a valid JSON object matching the provided schema.
    `;
    
    logCallback?.('Generating Ideas: Querying Gemini Pro for 3 hybrid concepts...');
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseMimeType: 'application/json',
            responseSchema: ideaGenerationSchema,
        },
    });

    logCallback?.('Generating Ideas: Received response. Parsing results.');
    const jsonText = extractJson(response.text);
    return JSON.parse(jsonText) as IdeaGenerationResult;
}

export async function generateBlueprint(analyses: AnalysisResult[], idea: HybridIdea, logCallback?: (message: string) => void): Promise<Blueprint> {
    logCallback?.(`Generating Blueprint: Starting process for "${idea.ideaName}".`);

    const analysesText = analyses.map(a => `
        Product: ${a.productName}
        Strengths: ${a.strengths.join(', ')}
        Flaws & Weaknesses: ${a.flaws.join(', ')}
        Unforeseen (Latent) Flaws: ${a.unforeseenFlaws.join(', ')}
        User Behavior & Human Impact: ${a.humanImpact}
        Design Logic & Missed Opportunities: ${a.missedOpportunities.join(', ')}
    `).join('\n---\n');

    const prompt = `
        You are an autonomous AI product strategist. Your goal is to use the provided analysis and the selected hybrid idea to generate a comprehensive, professional, and actionable product blueprint.

        You must follow the instructions below precisely. Your internal process should follow the AI Creative Strategy Log (AI CSL) protocol. Your final output must be a single JSON object conforming to the provided schema.

        ---
        **Phase 1 Analysis Summary:**
        ${analysesText}

        ---
        **Selected Idea from Phase 2:**
        **Idea Name:** ${idea.ideaName}
        **Description:** ${idea.whatItIs}
        **Reasoning:** ${idea.reasoning}
        **Why It's Better:** ${idea.whyBetter}

        ---
        **AI CSL Blueprint Generation Protocol (Phase 3)**

        **Goal:** Using the selected idea from Phase 2, generate a comprehensive, professional, and actionable product blueprint, with full traceability in the AI CSL.

        **Step-by-Step Instructions**

        **Step 1: Retrieve Phase 1 & 2 Insights**
        - Automatically retrieve all insights for the selected idea from the context provided above.
        - Extract key data points: The core recombination logic, linked Phase 1 insights, target user profile, problem statement, high-level features, and societal impact.
        - Record all extracted insights in a new AI CSL entry for Phase 3.

        **Step 2: Formalize Blueprint Sections**
        - **Title:** Create a formal title for the blueprint, e.g., "A Strategic Blueprint for ${idea.ideaName}".
        - **Abstract:** Write a concise, single-paragraph summary of the entire document, covering the problem, solution, and potential impact.
        - **Introduction:**
            - Expand the problem statement based on Phase 1 analysis.
            - Detail the proposed solution and its core functionality from the Phase 2 idea.
            - Articulate a clear and compelling value proposition based on the "Why It's Better" section.
        - Log each section's generation process in your internal AI CSL.

        **Step 3: Conduct Market & Business Analysis**
        - Based on Phase 1 & 2 data, research and define:
            - **Target Audience Persona:** A detailed description of the ideal user.
            - **Market Size & Potential:** High-level analysis of viability and growth.
            - **Competitive Landscape:** Existing competitors and differentiators, drawing from Phase 1.
            - **Monetization Strategy:** Propose viable revenue models (e.g., subscription, one-time purchase).
            - **Go-To-Market Plan:** Initial steps for launch and user acquisition.
        - Log all research, reasoning, and sources in your internal AI CSL.

        **Step 4: Detail Product & Technical Specifications**
        - **Key Features (MVP):** Outline the 3-5 most critical features for a Minimum Viable Product.
        - **Technology Stack:** Suggest a modern, scalable tech stack suitable for building the product.
        - **Generate Diagrams:**
            - Create a **User Journey Diagram** (flowchart) mapping the user's experience.
            - Create a **System Architecture Diagram** showing main components (e.g., Frontend, Backend, Database).
        - **MANDATORY SVG Design & Execution Protocol:**
            Adherence to the Design Rules is mandatory and non-negotiable.
            
            **Design Rules (The "Checklist")**
            You must adhere to every rule listed below:
            1. **Element Separation (No Overlap):** All elements (arrows, connectors, shapes, icons) must be clearly separated. No element may overlap or cross over any text or any other line.
            2. **Text Containment & Padding:** All text inside a shape (e.g., a box or circle) must be fully contained within that shape's boundaries. There must be a clear internal margin (padding) so that no part of any letter touches the shape's outline.
            3. **Text Alignment:** All text within shapes must be centered, both horizontally and vertically.
            4. **Layout & Organization:** The entire diagram must be neat, well-organized, and logically structured. Elements must be aligned and spaced consistently for an uncluttered, professional appearance.
            5. **Arrow/Connector Placement:** All connectors (arrows) must point clearly from one shape's outline to another shape's outline. They should not float vaguely or overlap the text within a shape.
            6. **Multi-line Text Handling:** To prevent text from jumbling and overlapping, you MUST handle multi-line text correctly. For any text that needs to wrap inside a shape, break it into separate lines. Each line MUST be its own \`<tspan>\` element within the parent \`<text>\` tag. Use \`dy="1.2em"\` on subsequent \`<tspan>\` elements to create vertical line breaks. This is mandatory. Example: \`<text x="100" y="50" text-anchor="middle"><tspan>First Line</tspan><tspan x="100" dy="1.2em">Second Line</tspan></text>\`.
            
            **Execution Process**
            Your operational flow for generating each diagram must be as follows:
            1. **Generate Draft:** First, you will generate a draft of the requested diagram.
            2. **STOP (Internal Verification):** Before finalizing the SVG, you must stop and enter a verification phase.
            3. **Perform Quality Check:** You will internally review your draft against every single rule in the "Design Rules" checklist above.
            4. **Self-Correct:**
                - If the draft fails even one rule (e.g., text is not centered, text touches a line, an arrow overlaps another element), you must discard that draft.
                - You will then regenerate the diagram from scratch, focusing on correcting the specific failure.
            5. **Repeat Loop:** You will repeat this "Generate -> Check -> Self-Correct" loop as many times as necessary until you have a final version that passes 100% of the Design Rules.
            6. **Final Output:** Only include the final, 100% compliant SVG string in the JSON output. Do not describe this process or mention the drafts; just provide the finished, perfect result.
        - Log diagram generation logic and component choices in your internal AI CSL.

        **Step 5: Create Implementation Roadmap**
        - Create a high-level, 4-step DIY guide.
        - Each step must include a title, description, and actionable items for a small team or individual.
        - Log the reasoning for each step in your internal AI CSL.

        **Step 6: Formulate Conclusion**
        - Write a concluding summary that reinforces the product's potential and outlines future outlook.
        - Log conclusion in your internal AI CSL.

        ---
        **Final Output Generation Instructions:**

        Based on your comprehensive CSL process, populate the provided JSON schema. Your internal log is for your process; the output MUST be this JSON. All text must be in a professional, academic tone. DO NOT use markdown characters like '*', '#', or '-'.
    `;
    
    logCallback?.(`Generating Blueprint: Querying Gemini Pro for "${idea.ideaName}"...`);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseMimeType: 'application/json',
            responseSchema: blueprintSchema,
        },
    });

    logCallback?.(`Generating Blueprint: Received response for "${idea.ideaName}". Parsing...`);
    const jsonText = extractJson(response.text);
    return JSON.parse(jsonText) as Blueprint;
}
