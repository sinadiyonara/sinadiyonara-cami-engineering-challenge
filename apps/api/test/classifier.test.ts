import { describe, expect, it } from 'vitest';
import { KeywordClassifier } from '../src/requests/keyword-classifier';

describe('KeywordClassifier', () => {
  const classifier = new KeywordClassifier();

  it.each([
    ['billing beats sales and support', 'help me upgrade, my bill is wrong', 'billing'],
    ['sales beats support', 'help me upgrade my plan', 'sales'],
    ['upper case still matches', 'REFUND THIS INVOICE', 'billing'],
    ['nothing matches', 'Hello there', 'unknown'],
  ])('%s', (_name, message, category) => {
    expect(classifier.classify(message).category).toBe(category);
  });

  // Worth knowing rather than desired: rules match substrings, so "airplane" contains "plan".
  it('matches inside longer words', () => {
    expect(classifier.classify('my airplane is late').category).toBe('sales');
  });
});
