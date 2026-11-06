import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ClassificationRecord } from './classification-record.entity';
import { CLASSIFICATION_REPOSITORY, ClassificationRepository } from './classification-repository';
import {
  CLASSIFIER_PROVIDER,
  ClassificationResult,
  ClassifierProvider,
} from './classifier-provider';
import { RequestsService } from './requests.service';

const HISTORY_LIMIT = 100;

export type ClassifyRequestBody = {
  message?: unknown;
  requestId?: string;
};

export type ClassifyResponse = ClassificationResult & { requestId: string | null };

export type ClassificationHistory = {
  items: ClassificationRecord[];
};

@Injectable()
export class ClassificationService {
  constructor(
    private readonly requestsService: RequestsService,
    @Inject(CLASSIFIER_PROVIDER)
    private readonly classifier: ClassifierProvider,
    @Inject(CLASSIFICATION_REPOSITORY)
    private readonly classifications: ClassificationRepository,
  ) {}

  async classify(body: ClassifyRequestBody): Promise<ClassifyResponse> {
    const message = body?.message;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new BadRequestException('message must be a non-empty string');
    }

    if (message.length > 2000) {
      throw new BadRequestException('message too long');
    }

    const trimmed = message.trim();
    let result = await this.classifier.classify(trimmed);

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
    const existing = requestId ? await this.requestsService.getById(requestId) : null;
    if (existing) {
      existing.category = result.category;
      existing.confidence = result.confidence;
      if (existing.status === 'open') {
        existing.status = 'in_progress';
      }
    }

    await this.classifications.save(
      {
        requestId: requestId ?? null,
        message: trimmed,
        category: result.category,
        confidence: result.confidence,
        provider: this.classifier.name,
      },
      existing,
    );

    return {
      category: result.category,
      confidence: result.confidence,
      requestId: requestId ?? null,
    };
  }

  async history(category?: string): Promise<ClassificationHistory> {
    const items = await this.classifications.findRecent({ category, limit: HISTORY_LIMIT });
    return { items };
  }
}
