export interface AnalysisResult {
  productName: string;
  introduction: string;
  manufacturingOrigin: string;
  strengths: string[];
  flaws: string[];
  humanImpact: string;
  missedOpportunities: string[];
  enhancementIdeas: string[];
  unforeseenFlaws: string[];
}

export interface UltimateIdea {
  ideaName: string;
  whatItIs: string;
  useCase: string;
  situation: string;
  humanImpact: string;
  novelSolutions: string;
}

export interface HybridIdea {
  ideaName:string;
  whatItIs: string;
  reasoning: string;
  whyBetter: string;
}

export interface IdeaGenerationResult {
  thinkingProcess: string;
  ideas: HybridIdea[];
}

export interface DIYStep {
  step: number;
  title: string;
  description: string;
  actionableItems: string[];
}

export interface Diagram {
    title: string;
    type: 'flowchart' | 'architecture' | 'userJourney';
    svg: string;
}

export interface Blueprint {
  title: string;
  abstract: string;
  introduction: {
      problemStatement: string;
      proposedSolution: string;
      valueProposition: string;
  };
  marketAnalysis: {
      targetAudience: string;
      marketSize: string;
      competitiveLandscape: string;
  };
  productSpecification: {
      keyFeatures: string[];
      userJourneyDiagram: Diagram;
      techStack: string[];
      architectureDiagram: Diagram;
  };
  businessStrategy: {
      monetizationStrategy: string[];
      goToMarketPlan: string[];
  };
  implementationRoadmap: {
      diyGuide: DIYStep[];
  };
  conclusion: string;
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