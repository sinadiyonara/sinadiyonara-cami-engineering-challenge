import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ClassificationRecord } from './classification-record.entity';
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

export type ClassifyResponse =
  | (ClassificationResult & { requestId: string | null })
  | { error: string };

export type ClassificationHistory = {
  items: ClassificationRecord[];
};

@Injectable()
export class ClassificationService {
  constructor(
    private readonly requestsService: RequestsService,
    @Inject(CLASSIFIER_PROVIDER)
    private readonly classifier: ClassifierProvider,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(ClassificationRecord)
    private readonly records: Repository<ClassificationRecord>,
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

    // One transaction, so a request and its history cannot disagree.
    await this.dataSource.transaction(async (manager) => {
      if (existing) {
        await manager.save(existing);
      }
      await manager.save(
        manager.create(ClassificationRecord, {
          requestId: requestId ?? null,
          message: trimmed,
          category: result.category,
          confidence: result.confidence,
          provider: this.classifier.name,
        }),
      );
    });

    return {
      category: result.category,
      confidence: result.confidence,
      requestId: requestId ?? null,
    };
  }

  async history(category?: string): Promise<ClassificationHistory> {
    const items = await this.records.find({
      // A repeated query parameter arrives as an array, so only a single value filters.
      where: category && typeof category === 'string' ? { category } : {},
      order: { createdAt: 'DESC', id: 'DESC' },
      take: HISTORY_LIMIT,
    });
    return { items };
  }
}
