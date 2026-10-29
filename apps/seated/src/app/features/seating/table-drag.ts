import { createDragRef, type DragRef } from '@angular/cdk/drag-drop';
import {
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  input,
  output,
} from '@angular/core';

/**
 * Free drag of a table on the plan by its top. Uses a CDK DragRef with the
 * table top as the only handle (seats keep their own drag), the plan as the
 * boundary and the zoom as the drag scale, then reports the distance in plan
 * units. The table never moves itself: the page commits one moveTable command
 * and the new centre comes back through the store.
 */
@Directive({ selector: 'st-table[stTableDrag]' })
export class TableDrag {
  /** Current zoom, so pointer pixels convert to plan units. */
  readonly scale = input(1, { alias: 'stTableDrag' });
  /** Distance moved in plan units, emitted once on release. */
  readonly tableMoved = output<{ dx: number; dy: number }>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private ref: DragRef | null = null;

  constructor() {
    afterNextRender(() => {
      const handle = this.host.querySelector<HTMLElement>('button.top');
      const boundary = this.host.closest<HTMLElement>('.plane');
      if (!handle) return;
      // The kit centres a placed table with a translate; inline it so the drag composes with it.
      this.host.style.transform = 'translate(-50%, -50%)';
      const ref = createDragRef(this.injector, this.host, {
        dragStartThreshold: 4,
        pointerDirectionChangeThreshold: 5,
      }).withHandles([handle]);
      if (boundary) ref.withBoundaryElement(boundary);
      ref.scale = this.scale();
      ref.started.subscribe(() => this.host.classList.add('is-dragging'));
      const settle = () => {
        ref.reset();
        this.host.classList.remove('is-dragging');
      };
      ref.ended.subscribe(({ distance }) => {
        const scale = ref.scale || 1;
        const [dx, dy] = [distance.x / scale, distance.y / scale];
        if (Math.hypot(dx, dy) < 5) {
          settle();
          return;
        }
        this.tableMoved.emit({ dx, dy });
        // Drop the drag transform only once the committed position has rendered, so nothing jumps.
        afterNextRender(settle, { injector: this.injector });
      });
      this.ref = ref;
    });
    effect(() => {
      const scale = this.scale();
      if (this.ref) this.ref.scale = scale;
    });
    inject(DestroyRef).onDestroy(() => this.ref?.dispose());
  }
}
