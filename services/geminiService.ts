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
  },
  required: [
    'productName', 'introduction', 'manufacturingOrigin', 'strengths', 'flaws',
    'humanImpact', 'missedOpportunities', 'enhancementIdeas', 'unforeseenFlaws'
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


const analysisPrompt = `Analyze the product provided by the user (minimum 2, maximum 5) using the Inventor-Analysis Instruction Protocol (V2.0) and the Genius Inventor Cognitive Expansion Layer (Section 16) exactly as defined below.

Your goal in this phase is not to generate new product ideas yet, but to conduct a deep, structured, and comparative analytical breakdown of all input products.
Keep in mind throughout that this analysis will serve as the foundation for later creative synthesis in a separate stage.

──────────────────────────
Execution Rules

1. Input Range:
 Analyze the products provided by the user (2–5 products). Treat each as an independent analytical object.


2. Purpose Reminder:
 This entire analysis aims to extract every possible insight, flaw, pattern, and principle from existing products so that they can later be recombined into new inventions.
 Do not jump to ideation. Focus purely on structured understanding, decomposition, and comparison.


3. Follow This Full Reasoning Flow:



 Section 1 – Product Overview
 Identify:
 • Product name and category
 • Inventor or originating organization
 • Year of invention or release
 • Geographic/market context

 Section 2 – Purpose and Core Function
 Define:
 • Primary function or role
 • The user problem it solves
 • Key technological principle

 Section 3 – Design Structure and Components
 Break down architecture and layers:
 • Physical (materials, mechanics)
 • Digital (software, sensors, data systems)
 • Experiential (UI, interaction, ergonomics)

 Section 4 – Mechanism and Working Logic
 Explain how it works from input → process → output → feedback.
 Map internal dependencies and system flow.

 Section 5 – Innovation Highlights
 Document unique design choices, patents, or breakthroughs that distinguish it.

 Section 6 – Flaws, Limitations, and Gaps
 Identify weak points, usability issues, design compromises, inefficiencies, or maintenance problems.

 Section 7 – User Experience and Behavioral Insights
 Analyze emotional, cognitive, and ergonomic interaction.
 Note how real-world users behave vs. intended use.

 Section 8 – Market and Adoption Context
 Summarize:
 • Target users
 • Market positioning and adoption timeline
 • Cultural or symbolic value
 • Competing alternatives

 Section 9 – Comparative Cross-Product Matrix
 Compare all analyzed products to find shared traits, complementary strengths, overlapping technologies, or opposing philosophies.
 Identify where one product’s flaw aligns with another’s strength.

 Section 10 – Extracted Design Principles
 Abstract design heuristics, engineering patterns, and UX insights.
 Distinguish between transferable principles and product-specific quirks.

 Section 11 – Contextual and External Constraints
 Analyze supply chain, regulatory, environmental, and ethical considerations that influenced design.

 Section 12 – Historical and Developmental Background
 Trace origin stories, prototype evolutions, and design pivots.

 Section 13 – Cognitive Divergence Phase
 Apply higher-order reasoning without ideating:
 • Ask “why was it made this way?” repeatedly
 • Identify contradictions and trade-offs
 • Note where assumptions limit innovation
 • Record potential inversions (what if the opposite were true?)

 Section 14 – Traceability and Documentation
 Record all findings in structured format (text or JSON).
 Each observation must include its source and reasoning trace.

 Section 15 – Reflection Summary
 Summarize all extracted insights, hidden design logic, patterns, and contradictions across products.
 No idea generation — only analytical synthesis.

 Section 16 – Genius Inventor Cognitive Expansion Layer
 Maintain awareness of the purpose of this analysis.
 Keep curiosity active, continuously asking “what principle or pattern could this reveal for future recombination?”
 Apply first-principles reasoning, systems thinking, and philosophical reflection throughout — but store these reflections for later ideation use.

──────────────────────────
Thinking Behavior:
 • Treat flaws as data, not failures.
 • Prioritize observation over speculation.
 • Cross-validate every insight logically.
 • Seek systemic causality behind each feature or flaw.
 • Keep in mind this layer’s output will feed a later invention stage.

──────────────────────────
Output Requirements:
 • Full structured breakdown for each analyzed product (Sections 1–15).
 • One comparative analysis matrix (Section 9).
 • Consolidated reflection summary (Section 15).
 • All data formatted in structured text or JSON, including traceable reasoning for every insight.

──────────────────────────
Make sure you have done the following:

“Analyze the products provided by the user (minimum 2, maximum 5) using and filtering exactly the complete Inventor-Analysis Instruction Protocol (V2.0) and Genius Inventor Cognitive Expansion Layer.
Perform full structured analysis only — no idea generation.
Keep in mind this is the analytical foundation for later creative synthesis.
Output a fully traceable, comparative breakdown of each products, their design logic, flaws, innovations, and extracted principles.”

Based on your comprehensive analysis of the product "{productName}", populate the provided JSON schema. Synthesize your findings from the 16-section protocol into the following fields.

- productName: The exact name of the product.
- introduction: A summary of Section 1 (Product Overview) and Section 2 (Purpose and Core Function).
- manufacturingOrigin: A summary of the inventor/organization, year, and market context from Section 1.
- strengths: Synthesize key points from Section 5 (Innovation Highlights) and positive aspects of Section 3 (Design) and Section 7 (User Experience).
- flaws: Synthesize key points from Section 6 (Flaws, Limitations, Gaps).
- humanImpact: Summarize Section 7 (User Experience) and the broader cultural/symbolic value from Section 8.
- missedOpportunities: Extract insights from Section 13 (Cognitive Divergence), identifying where different design choices could have been made.
- enhancementIdeas: Abstract potential improvements from your analysis of flaws (Section 6) and limitations. Do not invent new products, but suggest direct enhancements.
- unforeseenFlaws: Based on Section 11 (External Constraints) and Section 13 (Cognitive Divergence), what are the broader, systemic issues or negative externalities that were likely not anticipated during its creation?
`;

export async function analyzeProduct(productName: string, logCallback?: (message: string) => void): Promise<AnalysisResult> {
  logCallback?.(`Analyzing "${productName}": Initializing analysis.`);
  try {
    logCallback?.(`Analyzing "${productName}": Querying Gemini Pro...`);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [{ parts: [{ text: analysisPrompt.replace('{productName}', productName) }] }],
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
    throw new Error(`Failed to analyze ${productName}. Please check the console for details.`);
  }
}

export async function generateHybridIdeas(analyses: AnalysisResult[], existingIdeas: HybridIdea[] = [], logCallback?: (message: string) => void): Promise<IdeaGenerationResult> {
    logCallback?.('Generating Ideas: Compiling product analyses.');
    const analysesText = analyses.map(a => `
        Product: ${a.productName}
        Strengths: ${a.strengths.join(', ')}
        Flaws: ${a.flaws.join(', ')}
        Enhancement Ideas: ${a.enhancementIdeas.join(', ')}
    `).join('\n---\n');

    const existingIdeasText = existingIdeas.length > 0 ? `
        ---
        PREVIOUSLY GENERATED IDEAS (DO NOT REPEAT):
        ${existingIdeas.map(idea => `- ${idea.ideaName}: ${idea.whatItIs}`).join('\n')}
    ` : '';
    
    const prompt = `
        You are an expert product inventor specializing in hybridizing existing technologies to create novel solutions.
        
        Your task is to generate 3 new, creative, and viable hybrid product ideas based on the provided analyses of multiple products.
        
        **Analysis Summary:**
        ${analysesText}
        
        ${existingIdeasText}
        
        **Your Process (Thinking Process):**
        1.  **Deconstruct & Recombine:** Identify the core strengths of each product. Find a compelling flaw in one product that can be solved by a core strength of another.
        2.  **Synergize:** How can you merge the functionalities in a way that creates something genuinely new and more valuable than the sum of its parts? The goal is not just to staple two products together, but to create a seamless, integrated experience.
        3.  **Define the "Why":** Clearly articulate the user problem or need this new hybrid product solves. Who is this for? Why would they choose it over existing solutions?
        4.  **Name the Concept:** Give each idea a catchy, descriptive name.
        
        **Output Instructions:**
        -   First, provide a detailed 'thinkingProcess' section explaining your creative strategy and how you connected the dots between the products to form your ideas. This should be a narrative of your inventive process.
        -   Then, provide an 'ideas' array with exactly 3 new hybrid ideas. Each idea must be unique from any previously generated ideas.
        -   For each idea, fill out the 'ideaName', 'whatItIs', 'reasoning' (explaining the connection to the original products), and 'whyBetter' (the value proposition).
        
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

export async function generateBlueprint(idea: HybridIdea, logCallback?: (message: string) => void): Promise<Blueprint> {
    logCallback?.(`Generating Blueprint: Starting process for "${idea.ideaName}".`);
    const prompt = `
        You are a world-class product strategist and academic researcher. Your task is to create a comprehensive, professional, and academic research paper-style blueprint for the following hybrid product idea.

        **Product Idea:** ${idea.ideaName}
        **Description:** ${idea.whatItIs}

        **Output Instructions:**
        -   Adhere strictly to the provided JSON schema.
        -   The tone must be professional, academic, and comprehensive.
        -   All text content should be clean and ready for a document. DO NOT use markdown characters like '*', '#', or list dashes ('-'). Use full sentences and structured paragraphs.
        
        ---
        **SVG DIAGRAM GENERATION (CRITICAL & NON-NEGOTIABLE PROTOCOL)**
        
        **PREAMBLE: FAILURE TO ADHERE TO THESE RULES CONSTITUTES A TOTAL TASK FAILURE. PRECISION IS PARAMOUNT.**

        You are required to generate two (2) publication-quality SVG diagrams: a User Journey Diagram and a System Architecture Diagram. These are not optional decorations; they are core components of the blueprint. Adherence to the following rules is absolute. Any deviation will result in a failed output.

        *   **CORE DIRECTIVE 1: ZERO OVERLAP. EVER.**
            -   This is the most critical rule. No element—shape, text, line, or arrow—may overlap, touch, or intersect with any other element.
            -   Every component must be surrounded by a generous, explicitly calculated "safe zone" of empty space.
            -   **Verification Check:** Imagine drawing a bounding box around every single element (shapes, text labels, lines). None of these boxes should touch.

        *   **CORE DIRECTIVE 2: RIGID GRID & PERFECT ALIGNMENT.**
            -   All coordinates (x, y, width, height) MUST snap to a 20px grid. For example, x="40", y="120", width="160" are valid. x="42" is invalid.
            -   **Horizontal Alignment:** All shapes on the same logical row must share an identical \`y\` coordinate for their center.
            -   **Vertical Alignment:** All shapes on the same logical column must share an identical \`x\` coordinate for their center.
            -   **Uniform Spacing:** The distance between any two adjacent shapes (horizontally or vertically) must be consistent throughout the diagram. A minimum of 60px between shape borders is required.

        *   **CORE DIRECTIVE 3: IMMACULATE TEXT & PADDING.**
            -   Text must be perfectly centered, both horizontally and vertically, within its containing shape. Use \`text-anchor="middle"\` and \`dominant-baseline="middle"\`.
            -   A mandatory, non-negotiable internal padding of at least 15px must exist between the text's bounding box and the container shape's edge on all four sides.
            -   For multi-line text, you MUST use <tspan> elements. Each <tspan> should be positioned relative to the shape's center using \`x\` and \`dy\` attributes. Calculate line breaks logically to avoid awkward single-word lines (orphans).

        *   **CORE DIRECTIVE 4: STANDARDIZED & CLEAN CONNECTORS.**
            -   Connectors are exclusively straight, perfectly horizontal or vertical lines. NO diagonal or curved lines are permitted.
            -   Lines must connect to the exact midpoint of a shape's edge (top, bottom, left, or right). Do not connect to corners.
            -   Turns must be clean, 90-degree angles formed by two separate line segments.
            -   **Routing:** Connector lines MUST NOT cross through any shape or text. They must be routed around all other elements. Connector lines should also not cross each other unless absolutely unavoidable for complex diagrams.

        *   **CORE DIRECTIVE 5: PROFESSIONAL & CONSISTENT STYLING.**
            -   You must use a <defs><style> block to define CSS classes. This is not optional. The SVG body should only contain class attributes for styling.
            -   **CSS Specification (Use this exactly):**
                \`\`\`css
                .container { background-color: transparent; }
                .box { fill: #1e293b; stroke: #475569; stroke-width: 2px; rx: 8px; }
                .box-text { font-family: 'Inter', sans-serif; font-size: 14px; fill: #cbd5e1; text-anchor: middle; dominant-baseline: middle; }
                .arrow-line { fill: none; stroke: #22d3ee; stroke-width: 2px; marker-end: url(#arrowhead); }
                .arrow-head { fill: #22d3ee; }
                .tier-label { font-family: 'Inter', sans-serif; font-size: 12px; fill: #94a3b8; text-anchor: middle; }
                \`\`\`
            -   **Arrowhead Definition:** You must define a marker for arrowheads inside <defs>. Example: <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="arrow-head" /></marker>

        *   **CORE DIRECTIVE 6: OPTIMIZED CANVAS & VIEWBOX.**
            -   The final SVG must have a \`viewBox\` attribute that tightly frames the entire diagram.
            -   Calculate the total width and height of all diagram elements, then add a consistent margin (e.g., 20px) on all sides to determine the \`viewBox\` dimensions. The diagram must appear centered and well-proportioned, not crammed or excessively sparse.

        *   **CORE DIRECTIVE 7: FINAL SELF-CORRECTION AND VALIDATION STEP.**
            -   Before finalizing the SVG string, perform a mental validation pass.
            -   Review every element against every rule listed above.
            -   Check for overlaps: Is there *any* element that is too close to another?
            -   Check for alignment: Are all shapes in the same row/column perfectly aligned?
            -   Check for spacing: Is the spacing between all elements uniform and generous?
            -   Check text: Is it perfectly centered with sufficient padding?
            -   Check connectors: Are they straight, right-angled, and cleanly routed?
            -   This is your final chance to fix errors. The output must be perfect.
        ---
        **Blueprint Structure:**
        -   **title:** A formal title for the product blueprint. E.g., "A Blueprint for ${idea.ideaName}: A Hybrid Solution for...".
        -   **abstract:** A brief, one-paragraph summary of the entire document.
        -   **introduction:**
            -   **problemStatement:** Clearly define the user problem.
            -   **proposedSolution:** Describe your product as the solution.
            -   **valueProposition:** State the unique value.
        -   **marketAnalysis:**
            -   **targetAudience:** Describe the primary user persona.
            -   **marketSize:** Provide a brief analysis of the market potential.
            -   **competitiveLandscape:** Discuss existing competitors and alternatives.
        -   **productSpecification:**
            -   **keyFeatures:** List the 3-5 most critical MVP features.
            -   **userJourneyDiagram:** An SVG flowchart illustrating the user's path from discovery to achieving their goal.
            -   **techStack:** Suggest a modern, scalable tech stack.
            -   **architectureDiagram:** An SVG diagram showing the high-level system components and their interactions (e.g., Frontend, Backend, Database, APIs).
        -   **businessStrategy:**
            -   **monetizationStrategy:** List potential revenue models.
            -   **goToMarketPlan:** List initial steps for launch and user acquisition.
        -   **implementationRoadmap:**
            -   **diyGuide:** A 4-step, high-level guide for a small team to start building.
        -   **conclusion:** A summary of the product's potential and future outlook.

        Respond ONLY with a valid JSON object matching the provided schema.
    `;
    
    logCallback?.(`Generating Blueprint: Querying Gemini Pro...`);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseMimeType: 'application/json',
            responseSchema: blueprintSchema,
        },
    });

    logCallback?.(`Generating Blueprint: Received response for "${idea.ideaName}". Parsing JSON.`);
    const jsonText = extractJson(response.text);
    return JSON.parse(jsonText) as Blueprint;
}


export async function paraphraseText(text: string, logCallback?: (message: string) => void): Promise<string> {
    logCallback?.('Paraphrasing: Reformatting AI thinking process for clarity.');
    const prompt = `
        Paraphrase the following text to be more engaging, clear, and structured for a presentation. 
        Use markdown for formatting (headings, lists). Avoid jargon where possible.
        
        Original Text:
        ---
        ${text}
        ---
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: prompt }] }],
    });
    
    logCallback?.('Paraphrasing: Complete.');
    return response.text;
}