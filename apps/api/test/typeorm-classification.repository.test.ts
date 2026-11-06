import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { DataSource, Repository } from 'typeorm';
import { ClassificationRecord } from '../src/requests/classification-record.entity';
import { NewClassification } from '../src/requests/classification-repository';
import { CustomerRequest } from '../src/requests/customer-request.entity';
import { TypeOrmClassificationRepository } from '../src/requests/typeorm-classification.repository';

const classification: NewClassification = {
  requestId: null,
  message: 'refund my invoice',
  category: 'billing',
  confidence: 0.86,
  provider: 'keyword',
};

// Mocks only show which calls are made. They can't prove a real transaction rolls back.
function setup() {
  const record = { id: 'record' };
  const manager = {
    create: vi.fn().mockReturnValue(record),
    save: vi.fn().mockResolvedValue(undefined),
  };
  const transaction = vi.fn(async (work: (m: typeof manager) => Promise<void>) => work(manager));
  const find = vi.fn().mockResolvedValue([]);
  const records = { find, save: vi.fn() };
  const repository = new TypeOrmClassificationRepository(
    { transaction } as unknown as DataSource,
    records as unknown as Repository<ClassificationRecord>,
  );
  return { repository, manager, transaction, record, records, find };
}

describe('TypeOrmClassificationRepository.save', () => {
  it('saves the request and the record through one transaction', async () => {
    const { repository, manager, transaction, record, records } = setup();
    const request = { id: 'request-1' } as CustomerRequest;

    await repository.save(classification, request);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(manager.create).toHaveBeenCalledWith(ClassificationRecord, classification);
    expect(manager.save.mock.calls).toEqual([[request], [record]]);
    expect(records.save).not.toHaveBeenCalled();
  });

  it('saves only the record when there is no request', async () => {
    const { repository, manager, record } = setup();

    await repository.save(classification, null);

    expect(manager.save.mock.calls).toEqual([[record]]);
  });

  it('passes a write error up, so the transaction can roll back', async () => {
    const { repository, manager } = setup();
    manager.save.mockRejectedValue(new Error('write failed'));

    await expect(repository.save(classification, null)).rejects.toThrow('write failed');
  });
});

describe('TypeOrmClassificationRepository.findRecent', () => {
  const order = { createdAt: 'DESC', id: 'DESC' };

  it('filters by category, newest first, up to the limit', async () => {
    const { repository, find } = setup();

    await repository.findRecent({ category: 'billing', limit: 100 });

    expect(find).toHaveBeenCalledWith({ where: { category: 'billing' }, order, take: 100 });
  });

  it.each([
    ['missing', undefined],
    ['blank', ''],
    ['repeated', ['billing', 'sales'] as unknown as string],
  ])('does not filter when the category is %s', async (_name, category) => {
    const { repository, find } = setup();

    await repository.findRecent({ category, limit: 100 });

    expect(find).toHaveBeenCalledWith({ where: {}, order, take: 100 });
  });
});
