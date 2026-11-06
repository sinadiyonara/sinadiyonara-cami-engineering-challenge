import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ClassificationService } from '../src/requests/classification.service';
import { RequestStatus } from '../src/requests/customer-request.entity';
import { RequestsController } from '../src/requests/requests.controller';
import { RequestsService } from '../src/requests/requests.service';

function setup() {
  const create = vi.fn().mockResolvedValue({ id: 'request-1' });
  const updateStatus = vi.fn().mockResolvedValue({ id: 'request-1' });
  const controller = new RequestsController(
    { create, updateStatus } as unknown as RequestsService,
    {} as ClassificationService,
  );
  return { controller, create, updateStatus };
}

describe('RequestsController.create', () => {
  it.each([
    ['missing', {}],
    ['empty', { message: '' }],
    ['not a string', { message: 42 as unknown as string }],
  ])('rejects with 400 when the message is %s', (_name, body) => {
    const { controller, create } = setup();

    expect(() => controller.create(body)).toThrow(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it('creates the request when the message is valid', async () => {
    const { controller, create } = setup();

    await controller.create({ message: 'hello' });

    expect(create).toHaveBeenCalledWith('hello');
  });
});

describe('RequestsController.updateStatus', () => {
  it('rejects with 400 when the status is missing', () => {
    const { controller, updateStatus } = setup();

    expect(() => controller.updateStatus('request-1', {})).toThrow(BadRequestException);
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it('updates the status when it is present', async () => {
    const { controller, updateStatus } = setup();
    const status: RequestStatus = 'resolved';

    await controller.updateStatus('request-1', { status });

    expect(updateStatus).toHaveBeenCalledWith('request-1', status);
  });
});
