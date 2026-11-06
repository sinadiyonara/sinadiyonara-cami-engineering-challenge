import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ClassificationRecord } from './classification-record.entity';
import {
  ClassificationFilter,
  ClassificationRepository,
  NewClassification,
} from './classification-repository';
import { CustomerRequest } from './customer-request.entity';

@Injectable()
export class TypeOrmClassificationRepository implements ClassificationRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(ClassificationRecord)
    private readonly records: Repository<ClassificationRecord>,
  ) {}

  async save(classification: NewClassification, request: CustomerRequest | null): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      if (request) {
        await manager.save(request);
      }
      await manager.save(manager.create(ClassificationRecord, classification));
    });
  }

  findRecent({ category, limit }: ClassificationFilter): Promise<ClassificationRecord[]> {
    return this.records.find({
      // A repeated query parameter arrives as an array, so only a single value filters.
      where: category && typeof category === 'string' ? { category } : {},
      order: { createdAt: 'DESC', id: 'DESC' },
      take: limit,
    });
  }
}
