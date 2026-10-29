import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StFloorZone } from '../floor-zone/floor-zone';
import { StFloor } from './floor';

@Component({
  imports: [StFloor, StFloorZone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <st-floor [width]="1200" [height]="800" [zoom]="zoom()" aria-label="Floor plan">
      <st-floor-zone kind="stage" label="Stage" [x]="40" [y]="40" [w]="320" [h]="80" />
    </st-floor>
  `,
})
class Host {
  readonly zoom = signal(1);
}

describe('StFloor', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const floor = (fixture.nativeElement as HTMLElement).querySelector('st-floor') as HTMLElement;
    return {
      fixture,
      floor,
      sizer: floor.querySelector<HTMLElement>('.sizer')!,
      plane: floor.querySelector<HTMLElement>('.plane')!,
    };
  }

  it('is a labelled region', async () => {
    const { floor } = await setup();
    expect(floor.getAttribute('role')).toBe('region');
    expect(floor.getAttribute('aria-label')).toBe('Floor plan');
  });

  it('lays out the plane in plan units and projects its children', async () => {
    const { plane } = await setup();
    expect(plane.style.width).toBe('1200px');
    expect(plane.style.height).toBe('800px');
    expect(plane.style.transform).toBe('');
    expect(plane.querySelector('st-floor-zone')).not.toBeNull();
  });

  it('scales the plane and grows the scroll area with zoom', async () => {
    const { fixture, sizer, plane } = await setup();
    fixture.componentInstance.zoom.set(0.5);
    await fixture.whenStable();
    expect(plane.style.transform).toBe('scale(0.5)');
    expect(sizer.style.width).toBe('600px');
    expect(sizer.style.height).toBe('400px');
  });
});
