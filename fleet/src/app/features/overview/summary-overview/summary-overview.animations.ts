import { trigger, style, animate, transition, query, stagger, group } from '@angular/animations';

export const Animations = {
  listAnimation: trigger('listAnimation', [
    transition(':enter', [
      query(
        ':enter',
        [
          style({
            opacity: 0,
            transform: 'translateY(10px)',
          }),
          stagger(35, [
            animate(
              '220ms cubic-bezier(0.22, 1, 0.36, 1)',
              style({
                opacity: 1,
                transform: 'translateY(0)',
              }),
            ),
          ]),
        ],
        { optional: true },
      ),
    ]),

    transition(':leave', [
      query(
        ':leave',
        [
          stagger(25, [
            animate(
              '160ms ease-in',
              style({
                opacity: 0,
                transform: 'translateY(8px)',
              }),
            ),
          ]),
        ],
        { optional: true },
      ),
    ]),
  ]),

  routeAnimation: trigger('routeAnimation', [
    transition('* <=> *', [
      query(
        ':enter, :leave',
        [
          style({
            position: 'absolute',
            width: '100%',
            height: '100%',
            top: 0,
            left: 0,
          }),
        ],
        { optional: true },
      ),

      group([
        query(
          ':leave',
          [
            animate(
              '140ms ease-out',
              style({
                opacity: 0,
                transform: 'translateY(-4px)',
              }),
            ),
          ],
          { optional: true },
        ),

        query(
          ':enter',
          [
            style({
              opacity: 0,
              transform: 'translateY(8px)',
            }),
            animate(
              '220ms cubic-bezier(0.22, 1, 0.36, 1)',
              style({
                opacity: 1,
                transform: 'translateY(0)',
              }),
            ),
          ],
          { optional: true },
        ),
      ]),
    ]),
  ]),

  fadeSlideUp: trigger('fadeSlideUp', [
    transition(':enter', [
      style({
        opacity: 0,
        transform: 'translateY(12px) scale(0.98)',
      }),
      animate(
        '220ms cubic-bezier(0.22, 1, 0.36, 1)',
        style({
          opacity: 1,
          transform: 'translateY(0) scale(1)',
        }),
      ),
    ]),

    transition(':leave', [
      animate(
        '160ms ease-in',
        style({
          opacity: 0,
          transform: 'translateY(8px) scale(0.98)',
        }),
      ),
    ]),
  ]),
};
