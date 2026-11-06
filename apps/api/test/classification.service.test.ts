import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ClassificationRepository } from '../src/requests/classification-repository';
import { ClassificationService } from '../src/requests/classification.service';
import { ClassificationResult, ClassifierProvider } from '../src/requests/classifier-provider';
import { CustomerRequest, RequestStatus } from '../src/requests/customer-request.entity';
import { RequestsService } from '../src/requests/requests.service';

const REQUEST_ID = '6f9619ff-8b86-4d11-b42d-00c04fc964ff';

function setup(result: ClassificationResult = { category: 'billing', confidence: 0.86 }) {

  const classify = vi.fn<ClassifierProvider['classify']>().mockReturnValue(result);
  const getById = vi.fn<RequestsService['getById']>();
  const save = vi.fn<ClassificationRepository['save']>().mockResolvedValue(undefined);
  const findRecent = vi.fn<ClassificationRepository['findRecent']>().mockResolvedValue([]);

  const service = new ClassificationService(
    { getById } as unknown as RequestsService,
    { name: 'test-provider', classify },
    { save, findRecent },
  );

  return { service, classify, getById, save, findRecent };
}

function request(status: RequestStatus) {
  return { id: REQUEST_ID, status, category: null, confidence: null } as CustomerRequest;
}

describe('ClassificationService.classify', () => {
  describe('confidence rules', () => {
    
    it('softens confidence for messages under three words', async () => {
      const { service } = setup({ category: 'billing', confidence: 0.86 });

      const result = await service.classify({ message: 'refund please' });

      expect(result).toMatchObject({ category: 'billing' });
      expect(result).toHaveProperty('confidence', expect.closeTo(0.71));
    });

    it('does not soften a message of exactly three words', async () => {
      const { service } = setup({ category: 'billing', confidence: 0.86 });

      const result = await service.classify({ message: 'refund my invoice' });

      expect(result).toMatchObject({ category: 'billing', confidence: 0.86 });
    });

    it('does not soften an unknown result', async () => {
      const { service } = setup({ category: 'unknown', confidence: 0.4 });

      const result = await service.classify({ message: 'hello' });

      expect(result).toMatchObject({ category: 'unknown', confidence: 0.4 });
    });

    it('never softens below 0.5', async () => {
      const { service } = setup({ category: 'sales', confidence: 0.6 });

      const result = await service.classify({ message: 'demo' });

      expect(result).toMatchObject({ category: 'unknown', confidence: 0.5 });
    });

    it('turns confidence below 0.55 into unknown', async () => {
      const { service } = setup({ category: 'support', confidence: 0.54 });

      const result = await service.classify({ message: 'this has enough words' });

      expect(result).toMatchObject({ category: 'unknown', confidence: 0.54 });
    });

    it('keeps the category at exactly 0.55', async () => {
      const { service } = setup({ category: 'support', confidence: 0.55 });

      const result = await service.classify({ message: 'this has enough words' });

      expect(result).toMatchObject({ category: 'support', confidence: 0.55 });
    });

    it('trims the message before classifying and counting words', async () => {
      const { service, classify } = setup({ category: 'billing', confidence: 0.86 });

      const result = await service.classify({ message: '   refund   ' });

      expect(classify).toHaveBeenCalledWith('refund');
      expect(result).toHaveProperty('confidence', expect.closeTo(0.71));
    });
  });

  describe('invalid input', () => {
    it.each([
      ['missing', {}, 'message must be a non-empty string'],
      ['blank', { message: '   ' }, 'message must be a non-empty string'],
      ['not a string', { message: 42 }, 'message must be a non-empty string'],
      ['too long', { message: 'a'.repeat(2001) }, 'message too long'],
    ])('rejects with 400 and saves nothing when the message is %s', async (_name, body, error) => {
      const { service, classify, save } = setup();

      const result = service.classify(body);

      await expect(result).rejects.toBeInstanceOf(BadRequestException);
      await expect(result).rejects.toThrow(error);

      expect(classify).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });

    it('accepts a message of exactly 2000 characters', async () => {
      const { service, save } = setup();

      await service.classify({ message: 'a'.repeat(2000) });

      expect(save).toHaveBeenCalledTimes(1);
    });
  });

  describe('saving', () => {
    it('saves the result with a null request when there is no requestId', async () => {
      const { service, getById, save } = setup();

      const result = await service.classify({ message: ' refund my invoice ' });

      expect(getById).not.toHaveBeenCalled();
      expect(save).toHaveBeenCalledWith(
        {
          requestId: null,
          message: 'refund my invoice',
          category: 'billing',
          confidence: 0.86,
          provider: 'test-provider',
        },
        null,
      );
      expect(result).toEqual({ category: 'billing', confidence: 0.86, requestId: null });
    });

    it('saves the final result, not the raw provider result', async () => {
      const { service, save } = setup({ category: 'support', confidence: 0.54 });

      await service.classify({ message: 'this has enough words' });

      expect(save.mock.calls[0][0].category).toBe('unknown');
    });

    it('updates the request and moves open to in_progress', async () => {
      const { service, getById, save } = setup();
      const row = request('open');
      getById.mockResolvedValue(row);

      await service.classify({ message: 'refund my invoice', requestId: REQUEST_ID });

      expect(row).toMatchObject({ category: 'billing', confidence: 0.86, status: 'in_progress' });
      expect(save).toHaveBeenCalledWith(expect.objectContaining({ requestId: REQUEST_ID }), row);
    });

    it.each<RequestStatus>(['in_progress', 'resolved'])('leaves %s status alone', async (status) => {
      const { service, getById } = setup();
      const row = request(status);
      getById.mockResolvedValue(row);

      await service.classify({ message: 'refund my invoice', requestId: REQUEST_ID });

      expect(row).toMatchObject({ category: 'billing', status });
    });

    it('works with an async provider', async () => {
      const { service, classify, save } = setup();
      classify.mockResolvedValue({ category: 'sales', confidence: 0.9 });

      const result = await service.classify({ message: 'book a demo please' });

      expect(result).toMatchObject({ category: 'sales', confidence: 0.9 });
      expect(save).toHaveBeenCalledTimes(1);
    });
  });

  describe('failures', () => {
    it('passes a provider error up and saves nothing', async () => {
      const { service, classify, save } = setup();
      classify.mockRejectedValue(new Error('provider down'));

      await expect(service.classify({ message: 'refund my invoice' })).rejects.toThrow(
        'provider down',
      );

      expect(save).not.toHaveBeenCalled();
    });
  });
});

describe('ClassificationService.history', () => {
  it('passes the category and a limit of 100 to the repository', async () => {
    const { service, findRecent } = setup();

    await expect(service.history('billing')).resolves.toEqual({ items: [] });

    expect(findRecent).toHaveBeenCalledWith({ category: 'billing', limit: 100 });
  });
});
