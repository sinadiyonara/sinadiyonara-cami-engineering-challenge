import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { Repository } from 'typeorm';
import { CustomerRequest } from '../src/requests/customer-request.entity';
import { RequestsService } from '../src/requests/requests.service';

function setup() {
  const repository = {
    query: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn().mockImplementation(async (row) => row),
  };
  const service = new RequestsService(repository as unknown as Repository<CustomerRequest>);
  return { service, repository };
}

describe('RequestsService.list', () => {
  const row = {
    id: 'request-1',
    message: 'hello',
    status: 'open',
    category: null,
    confidence: null,
    noteCount: 0,
    latestNotePreview: null,
    createdAt: new Date('2030-01-01T00:00:00Z'),
    updatedAt: new Date('2030-01-02T00:00:00Z'),
  };

  // A mock can't run the SQL, so this guards the one-query shape, not the join itself.
  it('uses one query however many requests come back', async () => {
    const { service, repository } = setup();
    repository.query.mockResolvedValue([row, { ...row, id: 'request-2' }, { ...row, id: 'request-3' }]);

    const items = await service.list();

    expect(items).toHaveLength(3);
    expect(repository.query).toHaveBeenCalledTimes(1);
    expect(repository.find).not.toHaveBeenCalled();
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('returns ISO dates and keeps a request with no notes', async () => {
    const { service, repository } = setup();
    repository.query.mockResolvedValue([row]);

    await expect(service.list()).resolves.toEqual([
      {
        ...row,
        createdAt: '2030-01-01T00:00:00.000Z',
        updatedAt: '2030-01-02T00:00:00.000Z',
      },
    ]);
  });
});

describe('RequestsService.getById', () => {
  it('throws NotFoundException when the request does not exist', async () => {
    const { service, repository } = setup();
    repository.findOne.mockResolvedValue(null);

    await expect(service.getById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('RequestsService.updateStatus', () => {
  it('saves the new status', async () => {
    const { service, repository } = setup();
    repository.findOne.mockResolvedValue({ id: 'request-1', status: 'open' });

    const updated = await service.updateStatus('request-1', 'resolved');

    expect(updated.status).toBe('resolved');
    expect(repository.save).toHaveBeenCalledTimes(1);
  });
});
