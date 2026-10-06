import { describe, expect, it } from 'vitest';
import { parseYouTubeId, parseYouTubeStart, youtubeEmbedUrl } from '@/lib/youtube';

describe('parseYouTubeId', () => {
  it.each([
    ['https://youtu.be/VP_kBA24VIU?si=XcDPgrZjfW0tQXsj', 'VP_kBA24VIU'],
    ['youtu.be/VP_kBA24VIU', 'VP_kBA24VIU'],
    ['https://www.youtube.com/watch?v=VP_kBA24VIU&feature=share', 'VP_kBA24VIU'],
    ['https://m.youtube.com/watch?v=VP_kBA24VIU', 'VP_kBA24VIU'],
    ['https://www.youtube.com/embed/VP_kBA24VIU', 'VP_kBA24VIU'],
    ['https://www.youtube-nocookie.com/embed/VP_kBA24VIU?rel=0', 'VP_kBA24VIU'],
    ['https://youtube.com/shorts/VP_kBA24VIU', 'VP_kBA24VIU'],
    ['https://www.youtube.com/live/VP_kBA24VIU', 'VP_kBA24VIU'],
    ['  VP_kBA24VIU  ', 'VP_kBA24VIU'],
  ])('%s → %s', (input, id) => {
    expect(parseYouTubeId(input)).toBe(id);
  });

  it.each([
    [''],
    [null],
    [undefined],
    ['https://vimeo.com/123456789'],
    ['https://evil.example/watch?v=VP_kBA24VIU'],
    ['https://youtube.com.evil.example/watch?v=VP_kBA24VIU'],
    ['https://www.youtube.com/playlist?list=PL123'],
    ['https://www.youtube.com/watch?v=short'],
    ['https://www.youtube.com/@digdir'],
    ['javascript:alert(1)'],
  ])('rejects %s', (input) => {
    expect(parseYouTubeId(input)).toBeNull();
  });
});

describe('parseYouTubeStart', () => {
  it.each([
    ['https://youtu.be/VP_kBA24VIU?t=90', 90],
    ['https://youtu.be/VP_kBA24VIU?t=90s', 90],
    ['https://www.youtube.com/watch?v=VP_kBA24VIU&t=1m30s', 90],
    ['https://www.youtube.com/watch?v=VP_kBA24VIU&t=1h2m3s', 3723],
    ['https://www.youtube.com/embed/VP_kBA24VIU?start=42', 42],
  ])('%s → %d', (input, seconds) => {
    expect(parseYouTubeStart(input)).toBe(seconds);
  });

  it.each([['https://youtu.be/VP_kBA24VIU'], ['https://youtu.be/VP_kBA24VIU?t=abc'], ['?t=0'], ['']])(
    'no start for %s',
    (input) => {
      expect(parseYouTubeStart(input)).toBeNull();
    },
  );
});

describe('youtubeEmbedUrl', () => {
  it('uses the privacy-enhanced host with Norwegian subtitles forced on by default', () => {
    const url = new URL(youtubeEmbedUrl('VP_kBA24VIU'));
    expect(url.origin).toBe('https://www.youtube-nocookie.com');
    expect(url.pathname).toBe('/embed/VP_kBA24VIU');
    expect(url.searchParams.get('cc_load_policy')).toBe('1');
    expect(url.searchParams.get('cc_lang_pref')).toBe('no');
    expect(url.searchParams.get('hl')).toBe('no');
    expect(url.searchParams.get('start')).toBeNull();
  });

  it('passes a start offset and another caption language through', () => {
    const url = new URL(youtubeEmbedUrl('VP_kBA24VIU', { captionLanguage: 'en', start: 90 }));
    expect(url.searchParams.get('cc_lang_pref')).toBe('en');
    expect(url.searchParams.get('start')).toBe('90');
  });
});
