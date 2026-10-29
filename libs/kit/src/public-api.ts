/*
 * Public surface of the Seated design kit. The app imports from '@seated/kit'
 * only; every component is exported here.
 */
export * from './tokens/tokens.g';

// Icons
export * from './lib/icons/icon/icons';
export * from './lib/icons/icon/icon';

// Actions
export * from './lib/actions/button/button';
export * from './lib/actions/icon-button/icon-button';
export * from './lib/actions/segmented/segmented';
export * from './lib/actions/kbd/kbd';

// Shared view-model types
export * from './lib/shared/tone';

// Display
export * from './lib/display/pill/pill';
export * from './lib/display/chip/chip';
export * from './lib/display/avatar/avatar';
export * from './lib/display/progress-ring/progress-ring';
export * from './lib/display/bar/bar';
export * from './lib/display/skeleton/skeleton';
export * from './lib/display/empty-state/empty-state';
export * from './lib/display/stat/stat';
export * from './lib/display/card/card';

// Forms
export * from './lib/forms/field/field-context';
export * from './lib/forms/field/field';
export * from './lib/forms/input/input';
export * from './lib/forms/switch/switch';
export * from './lib/forms/checkbox/checkbox';

// Seating
export * from './lib/seating/seat/seat';
export * from './lib/seating/table/table';
export * from './lib/seating/floor/floor';
export * from './lib/seating/floor-zone/floor-zone';

// Overlay and data (each group keeps its own barrel)
export * from './lib/overlay';
export * from './lib/data';
