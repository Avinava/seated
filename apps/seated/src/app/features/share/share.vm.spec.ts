import { shareUrl } from './share.vm';

describe('share vm', () => {
  it.each([
    ['https://seated.app', '/', 'https://seated.app/s#AQ'],
    ['https://seated.app/', '/', 'https://seated.app/s#AQ'],
    ['https://me.github.io', '/seated/', 'https://me.github.io/seated/s#AQ'],
    ['https://me.github.io', 'seated', 'https://me.github.io/seated/s#AQ'],
    ['http://localhost:4300', '', 'http://localhost:4300/s#AQ'],
  ])('builds the link from %s and base %j', (origin, base, url) => {
    expect(shareUrl(origin, base, 'AQ')).toBe(url);
  });
});
