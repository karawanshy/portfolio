import { decodeHash, hashElement } from './hash';

describe('hash helpers', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('decodes percent-encoded fragments', () => {
    expect(decodeHash('#caf%C3%A9')).toBe('#café');
  });

  it('keeps a malformed fragment as written instead of throwing', () => {
    expect(() => decodeHash('#%zz')).not.toThrow();
    expect(decodeHash('#%zz')).toBe('#%zz');
    expect(hashElement('#%zz')).toBeNull();
  });

  it('finds the element for a fragment, with or without the #', () => {
    document.body.innerHTML = '<section id="contact"></section>';
    expect(hashElement('#contact')?.id).toBe('contact');
    expect(hashElement('contact')?.id).toBe('contact');
    expect(hashElement('#')).toBeNull();
    expect(hashElement('')).toBeNull();
  });
});
