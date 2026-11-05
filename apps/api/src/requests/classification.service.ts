import { Injectable } from '@nestjs/common';
import { ClassificationResult, KeywordClassifier } from './keyword-classifier';
import { RequestsService } from './requests.service';

export type ClassifyRequestBody = {
  message?: unknown;
  requestId?: string;
};

export type ClassifyResponse =
  | (ClassificationResult & { requestId: string | null })
  | { error: string };

@Injectable()
export class ClassificationService {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly classifier: KeywordClassifier,
  ) {}

  async classify(body: ClassifyRequestBody): Promise<ClassifyResponse> {
    const message = body?.message;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return { error: 'message must be a non-empty string' };
    }

    if (message.length > 2000) {
      return { error: 'message too long' };
    }

    const trimmed = message.trim();
    let result = this.classifier.classify(trimmed);

    // Soften confidence for very short messages.
    if (trimmed.split(/\s+/).length < 3 && result.category !== 'unknown') {
      result = {
        category: result.category,
        confidence: Math.max(0.5, result.confidence - 0.15),
      };
    }

    // Prefer "unknown" when confidence is weak.
    if (result.confidence < 0.55) {
      result = { category: 'unknown', confidence: result.confidence };
    }

    const requestId = body.requestId;
    if (requestId) {
      const existing = await this.requestsService.getById(requestId);
      existing.category = result.category;
      existing.confidence = result.confidence;
      if (existing.status === 'open') {
        existing.status = 'in_progress';
      }
      await this.requestsService.save(existing);
    }

    return {
      category: result.category,
      confidence: result.confidence,
      requestId: requestId ?? null,
    };
  }
}
