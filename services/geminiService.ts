import type { AnalysisResult, HybridIdea, Blueprint, IdeaGenerationResult } from '../types';

type ApiPayload = Record<string, unknown>;

async function callGeminiApi<T>(payload: ApiPayload): Promise<T> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => null) as { data?: T; error?: string } | null;

  if (!response.ok) {
    throw new Error(result?.error || `AI request failed (${response.status}).`);
  }

  if (!result || result.data === undefined) {
    throw new Error('AI request returned an invalid response.');
  }

  return result.data;
}

export async function analyzeProduct(productName: string): Promise<AnalysisResult> {
  return callGeminiApi<AnalysisResult>({
    action: 'analyzeProduct',
    productName,
  });
}

export async function generateHybridIdeas(
  analyses: AnalysisResult[],
  existingIdeas: HybridIdea[]
): Promise<IdeaGenerationResult> {
  return callGeminiApi<IdeaGenerationResult>({
    action: 'generateHybridIdeas',
    analyses,
    existingIdeas,
  });
}

export async function generateBlueprint(
  analyses: AnalysisResult[],
  idea: HybridIdea
): Promise<Blueprint> {
  return callGeminiApi<Blueprint>({
    action: 'generateBlueprint',
    analyses,
    idea,
  });
}
