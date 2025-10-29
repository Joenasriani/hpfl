export interface AnalysisResult {
  productName: string;
  strengths: string[];
  flaws: string[];
  humanImpact: string;
  missedOpportunities: string[];
  enhancementIdeas: string[];
  unforeseenFlaws: string[];
  sources: { uri: string; title: string }[];
}

export interface UltimateIdea {
  ideaName: string;
  whatItIs: string;
  useCase: string;
  situation: string;
  humanImpact: string;
  novelSolutions: string;
}

export interface TrioIdea {
  ideaName:string;
  whatItIs: string;
  reasoning: string;
  whyBetter: string;
}

export interface IdeaGenerationResult {
  thinkingProcess: string;
  ideas: TrioIdea[];
}

export interface Blueprint {
  keyFeatures: string[];
  targetAudience: string;
  monetizationStrategy: string[];
}

export enum AppStep {
  INITIAL,
  ANALYZING,
  ANALYZED,
  GENERATING_IDEAS,
  IDEAS_GENERATED,
  GENERATING_BLUEPRINT,
  BLUEPRINT_GENERATED,
}