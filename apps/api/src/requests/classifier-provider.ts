export type ClassificationCategory = 'support' | 'sales' | 'billing' | 'unknown';

export type ClassificationResult = {
  category: ClassificationCategory;
  confidence: number;
};

export const CLASSIFIER_PROVIDER = Symbol('CLASSIFIER_PROVIDER');

/**
 * Anything that can classify a message. The return type allows a Promise so an LLM-backed
 * provider can fit behind the same interface.
 */
export interface ClassifierProvider {
  readonly name: string;
  classify(message: string): ClassificationResult | Promise<ClassificationResult>;
}
