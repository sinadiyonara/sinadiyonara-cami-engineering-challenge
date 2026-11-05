import { Injectable } from '@nestjs/common';

export type ClassificationCategory = 'support' | 'sales' | 'billing' | 'unknown';

export type ClassificationResult = {
  category: ClassificationCategory;
  confidence: number;
};

/**
 * Deterministic keyword classifier. Candidates may introduce a provider
 * interface and swap implementations (including a future LLM provider).
 */
@Injectable()
export class KeywordClassifier {
  classify(message: string): ClassificationResult {
    const text = message.toLowerCase();

    if (/bill|invoice|payment|refund|charge/.test(text)) {
      return { category: 'billing', confidence: 0.86 };
    }
    if (/buy|pricing|demo|sales|upgrade|plan/.test(text)) {
      return { category: 'sales', confidence: 0.8 };
    }
    if (/help|broken|error|issue|support|bug/.test(text)) {
      return { category: 'support', confidence: 0.78 };
    }

    return { category: 'unknown', confidence: 0.4 };
  }
}
