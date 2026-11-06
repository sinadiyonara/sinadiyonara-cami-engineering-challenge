import { ClassificationRecord } from './classification-record.entity';
import { CustomerRequest } from './customer-request.entity';

export const CLASSIFICATION_REPOSITORY = Symbol('CLASSIFICATION_REPOSITORY');

export type NewClassification = {
  requestId: string | null;
  message: string;
  category: string;
  confidence: number;
  provider: string;
};

export type ClassificationFilter = {
  category?: string;
  limit: number;
};

export interface ClassificationRepository {
  /**
   * Saves the classification and the updated request in one transaction, so a request and
   * its history cannot disagree.
   */
  save(classification: NewClassification, request: CustomerRequest | null): Promise<void>;
  findRecent(filter: ClassificationFilter): Promise<ClassificationRecord[]>;
}
