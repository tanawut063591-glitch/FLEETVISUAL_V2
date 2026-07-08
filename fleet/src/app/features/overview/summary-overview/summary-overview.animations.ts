import { trigger, style, animate, transition, query, stagger, keyframes } from '@angular/animations';

export const Animations = {
    listAnimation: trigger('listAnimation', [
        transition('* <=> *', [
            query(':enter', style({ opacity: 0, transform: 'translateY(-30px) scale(0.9)' }), { optional: true }),
            
            query(':enter', stagger('80ms', [
                animate('500ms cubic-bezier(0.35, 0, 0.25, 1)', keyframes([
                    style({ opacity: 0, transform: 'translateY(-40px) scale(0.9)', offset: 0 }),
                    style({ opacity: 0.8, transform: 'translateY(15px) scale(1.02)', offset: 0.6 }),
                    style({ opacity: 1, transform: 'translateY(0) scale(1)', offset: 1.0 }),
                ]))
            ]), { optional: true }),
            
            query(':leave', stagger('50ms', [
                animate('300ms ease-in', keyframes([
                    style({ opacity: 1, transform: 'translateY(0) scale(1)', offset: 0 }),
                    style({ opacity: 0.5, transform: 'translateY(-10px) scale(1.02)', offset: 0.3 }),
                    style({ opacity: 0, transform: 'translateY(50px) scale(0.8)', offset: 1.0 }),
                ]))
            ]), { optional: true })
        ])
    ])
};