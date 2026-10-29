import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { StSeat } from '../seating/seat/seat';
import { COLOR_TOKENS, RADII, TYPE_SCALE } from '../../tokens/tokens.g';

const SHARED = `
  :host { display: block; padding: 32px; max-width: 1080px; color: var(--st-text); }
  h2 { font-family: var(--st-font-display); font-weight: 600; font-size: var(--st-fs-3xl); letter-spacing: var(--st-tracking-display); line-height: 1.05; }
  .lede { margin: 8px 0 28px; color: var(--st-text-2); max-width: 60ch; }
  .mono { font-family: var(--st-font-mono); font-size: var(--st-fs-2xs); letter-spacing: var(--st-tracking-mono); text-transform: uppercase; color: var(--st-text-3); }
`;

@Component({
  selector: 'st-foundations-colors',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Colour</h2>
    <p class="lede">
      Warm-neutral paper, ink text and one teal accent: the lit seat. Four category tones mark groups. Every swatch
      below is the live token, so it follows the theme toolbar.
    </p>
    <ul class="grid">
      @for (t of tokens; track t.name) {
        <li class="swatch">
          <span class="chip" [style.background]="'var(' + t.cssVar + ')'"></span>
          <span class="name">{{ t.cssVar }}</span>
          <span class="value"><abbr title="Light theme">L</abbr> {{ t.light }}</span>
          <span class="value"><abbr title="Dark theme">D</abbr> {{ t.dark }}</span>
          @if (t.note) {
            <span class="note">{{ t.note }}</span>
          }
        </li>
      }
    </ul>
  `,
  styles: `
    ${SHARED}
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }
    .swatch {
      display: grid;
      gap: 4px;
      padding: 10px;
      border: 1px solid var(--st-line);
      border-radius: var(--st-radius-xl);
      background: var(--st-surface);
    }
    .chip {
      height: 56px;
      margin-bottom: 6px;
      border-radius: var(--st-radius-md);
      border: 1px solid var(--st-line);
    }
    .value {
      font-family: var(--st-font-mono);
      font-size: var(--st-fs-2xs);
      color: var(--st-text-2);
    }
    .value abbr {
      color: var(--st-text-3);
      text-decoration: none;
    }
    .name {
      font-family: var(--st-font-mono);
      font-size: var(--st-fs-xs);
      color: var(--st-text);
    }
    .note {
      font-size: var(--st-fs-sm);
      color: var(--st-text-2);
    }
  `,
})
class FoundationsColors {
  protected readonly tokens = COLOR_TOKENS;
}

@Component({
  selector: 'st-foundations-type',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Type</h2>
    <p class="lede">
      Bricolage Grotesque at 600 with tight tracking for display, Geist for the interface at a 14px base, Geist Mono for
      counts, dates and seat numbers.
    </p>
    <dl class="scale">
      @for (s of scale; track s[0]) {
        <dt class="mono">--st-fs-{{ s[0] }} · {{ s[1] }}</dt>
        <dd [style.font-size]="'var(--st-fs-' + s[0] + ')'" [class.display]="isDisplay(s[0])">
          {{ isDisplay(s[0]) ? 'Mehta x Iyer wedding' : 'Who is coming, what they eat and where they sit' }}
        </dd>
      }
    </dl>
    <div class="roles">
      <p class="role-display">Seat 207 guests</p>
      <p class="role-ui">Geist UI 14px. Buttons, labels and body copy.</p>
      <p class="mono">18 Dec 2026 · T3 · 8/10 seated</p>
    </div>
  `,
  styles: `
    ${SHARED}
    .scale {
      display: grid;
      grid-template-columns: 180px 1fr;
      gap: 14px 24px;
      align-items: baseline;
    }
    dd {
      margin: 0;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .display {
      font-family: var(--st-font-display);
      font-weight: 600;
      letter-spacing: var(--st-tracking-display);
      line-height: 1.05;
    }
    .roles {
      display: grid;
      gap: 10px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid var(--st-line);
    }
    .role-display {
      font-family: var(--st-font-display);
      font-weight: 600;
      font-size: var(--st-fs-4xl);
      letter-spacing: var(--st-tracking-display);
      line-height: 1.05;
    }
    .role-ui {
      font-size: var(--st-fs-base);
      color: var(--st-text-2);
    }
  `,
})
class FoundationsType {
  protected readonly scale = Object.entries(TYPE_SCALE).reverse();
  protected isDisplay(key: string): boolean {
    return ['5xl', '4xl', '3xl', '2xl', 'xl'].includes(key);
  }
}

@Component({
  selector: 'st-foundations-shape',
  imports: [StSeat],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Radius and motion</h2>
    <p class="lede">
      Controls use 8, cards 16, pills are fully round. Motion is short and physical: a spring for things that arrive, a
      settle curve for things that move. Everything collapses under reduced motion.
    </p>
    <ul class="radii">
      @for (r of radii; track r[0]) {
        <li>
          <span class="box" [style.border-radius]="'var(--st-radius-' + r[0] + ')'"></span>
          <span class="mono">{{ r[0] }} · {{ r[1] }}</span>
        </li>
      }
    </ul>
    <div class="motion">
      <button type="button" class="play" (click)="replay()">Replay motion</button>
      <div class="lane">
        <span class="mono">--st-ease-spring · --st-dur-slow</span>
        <span class="ball spring" [class.go]="go()"></span>
      </div>
      <div class="lane">
        <span class="mono">--st-ease-settle · --st-dur-base</span>
        <span class="ball settle" [class.go]="go()"></span>
      </div>
      <div class="lane">
        <span class="mono">Seat placed · --st-dur-glow</span>
        <!-- eslint-disable-next-line @angular-eslint/template/elements-content -- StSeat renders its label as text -->
        <button stSeat state="filled" initials="AS" [tone]="1" label="Seat placed" [justPlaced]="go()"></button>
      </div>
    </div>
  `,
  styles: `
    ${SHARED}
    .radii {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 36px;
    }
    .radii li {
      display: grid;
      justify-items: center;
      gap: 8px;
    }
    .box {
      width: 72px;
      height: 72px;
      background: var(--st-surface-2);
      border: 1px solid var(--st-line-2);
    }
    .motion {
      display: grid;
      gap: 16px;
    }
    .play {
      justify-self: start;
      height: var(--st-size-control);
      padding: 0 var(--st-space-3);
      border: 1px solid var(--st-line);
      border-radius: var(--st-radius-md);
      background: var(--st-surface);
    }
    .lane {
      display: grid;
      grid-template-columns: 260px 1fr;
      align-items: center;
      height: 40px;
    }
    .ball {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--st-accent);
    }
    .spring {
      transition: transform var(--st-dur-slow) var(--st-ease-spring);
    }
    .settle {
      transition: transform var(--st-dur-base) var(--st-ease-settle);
    }
    .ball.go {
      transform: translateX(320px);
    }
  `,
})
class FoundationsShape {
  protected readonly radii = Object.entries(RADII);
  protected readonly go = signal(false);
  protected replay(): void {
    this.go.set(false);
    requestAnimationFrame(() => requestAnimationFrame(() => this.go.set(true)));
  }
}

const meta: Meta = {
  title: 'Foundations/Tokens',
  parameters: { layout: 'fullscreen' },
  tags: ['!autodocs'],
};
export default meta;

type Story = StoryObj;

export const Colours: Story = {
  render: () => ({ moduleMetadata: { imports: [FoundationsColors] }, template: '<st-foundations-colors />' }),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('.swatch')).toHaveLength(COLOR_TOKENS.length);
    await expect(within(canvasElement).getByText('--st-accent')).toBeVisible();
  },
};

export const Type: Story = {
  render: () => ({ moduleMetadata: { imports: [FoundationsType] }, template: '<st-foundations-type />' }),
};

export const RadiusAndMotion: Story = {
  render: () => ({ moduleMetadata: { imports: [FoundationsShape] }, template: '<st-foundations-shape />' }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Replay motion' }));
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Seat placed' })).toHaveClass('is-placed'));
  },
};
