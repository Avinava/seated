import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';

/*
 * The manager UI cannot read the kit's CSS custom properties, so the theme below
 * mirrors the light tokens as sRGB hex (converted from design/tokens.json oklch).
 */
const seated = create({
  base: 'light',
  brandTitle: 'Seated kit',
  brandTarget: '_self',

  fontBase: "'Geist Variable', 'Geist', ui-sans-serif, system-ui, sans-serif",
  fontCode: "'Geist Mono Variable', 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace",

  colorPrimary: '#181e24',
  colorSecondary: '#0d8a83',

  appBg: '#f3f2ef',
  appContentBg: '#f9f9f7',
  appPreviewBg: '#f9f9f7',
  appBorderColor: '#e2e1de',
  appBorderRadius: 8,

  textColor: '#181e24',
  textMutedColor: '#646a70',
  textInverseColor: '#f9f9f7',

  barBg: '#fffefd',
  barTextColor: '#4a5158',
  barSelectedColor: '#0d8a83',
  barHoverColor: '#0d8a83',

  inputBg: '#fffefd',
  inputBorder: '#bfbeb8',
  inputTextColor: '#181e24',
  inputBorderRadius: 8,
});

addons.setConfig({
  theme: seated,
  sidebar: { showRoots: true },
});
