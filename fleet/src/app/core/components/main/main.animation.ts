import {
  trigger,
  transition,
  group,
  query,
  style,
  animate,
} from '@angular/animations';

const pageBaseStyle = style({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100%',
  height: '100%',
  overflow: 'hidden',
});

export const Animaions = {
  routeAnimation: trigger('routeAnimation', [
    transition(
      '1 => 2, 1 => 3, 1 => 4, 1 => 5, 2 => 3, 2 => 4, 2 => 5, 3 => 4, 3 => 5, 4 => 5',
      [
        style({ height: '100%', position: 'relative', overflow: 'hidden' }),
        query(':enter', style({ transform: 'translateX(100%)' }), { optional: true }),
        query(':enter, :leave', pageBaseStyle, { optional: true }),
        group([
          query(
            ':leave',
            [animate('0.35s cubic-bezier(.35,0,.25,1)', style({ transform: 'translateX(-100%)' }))],
            { optional: true }
          ),
          query(
            ':enter',
            [animate('0.35s cubic-bezier(.35,0,.25,1)', style({ transform: 'translateX(0)' }))],
            { optional: true }
          ),
        ]),
      ]
    ),
    transition(
      '5 => 4, 5 => 3, 5 => 2, 5 => 1, 4 => 3, 4 => 2, 4 => 1, 3 => 2, 3 => 1, 2 => 1',
      [
        style({ height: '100%', position: 'relative', overflow: 'hidden' }),
        query(':enter', style({ transform: 'translateX(-100%)' }), { optional: true }),
        query(':enter, :leave', pageBaseStyle, { optional: true }),
        group([
          query(
            ':leave',
            [animate('0.35s cubic-bezier(.35,0,.25,1)', style({ transform: 'translateX(100%)' }))],
            { optional: true }
          ),
          query(
            ':enter',
            [animate('0.35s cubic-bezier(.35,0,.25,1)', style({ transform: 'translateX(0)' }))],
            { optional: true }
          ),
        ]),
      ]
    ),
  ]),
};
