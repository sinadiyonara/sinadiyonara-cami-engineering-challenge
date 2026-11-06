import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { Repository } from 'typeorm';
import { CustomerRequest } from '../src/requests/customer-request.entity';
import { RequestsService } from '../src/requests/requests.service';

function setup() {
  const repository = {
    query: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
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

  // The list contents are proven against real SQL in requests.integration.test.ts. A mock is
  // still the simplest way to pin the query count, so the N+1 cannot come back.
  it('uses one query however many requests come back', async () => {
    const { service, repository } = setup();
    repository.query.mockResolvedValue([row, { ...row, id: 'request-2' }, { ...row, id: 'request-3' }]);

    const items = await service.list();

    expect(items).toHaveLength(3);
    expect(repository.query).toHaveBeenCalledTimes(1);
    expect(repository.find).not.toHaveBeenCalled();
    expect(repository.findOne).not.toHaveBeenCalled();
  });
});
