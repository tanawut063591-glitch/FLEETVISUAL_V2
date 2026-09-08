import { RealtimeMachineryService } from './realtime-machinery.service';

describe('RealtimeMachineryService', () => {
  let service: RealtimeMachineryService;

  beforeEach(() => {
    service = new RealtimeMachineryService();
  });

  it('loads exact machinery positions for a conventional propulsion vessel', () => {
    const positions = service.getForPrefix('A01-');
    expect(positions.map((item) => item.title)).toEqual([
      'PORT MAIN ENGINE',
      'CENTER MAIN ENGINE',
      'STARBOARD MAIN ENGINE',
      'PORT AUX. ENGINE',
      'STARBOARD AUX. ENGINE',
    ]);
  });

  it('loads diesel-electric machinery positions and ignores punctuation in prefix matching', () => {
    const positions = service.getForPrefix('a06_');
    expect(positions.length).toBe(6);
    expect(positions.some((item) => item.title === 'PORT MOTOR')).toBeTrue();
    expect(positions.some((item) => item.title === 'DIESEL GENERATOR 4')).toBeTrue();
  });

  it('preserves a selected profile when Realtime positions are refreshed', () => {
    const positions = service.getForPrefix('MV_GEMIA');
    const first = service.mergeAssignments([], positions);
    first[0].profileId = 'custom-main-profile';
    first[0].displayName = 'Custom Main Profile';

    const refreshed = service.mergeAssignments(first, positions);
    expect(refreshed[0].position).toBe('PORT MAIN ENGINE');
    expect(refreshed[0].profileId).toBe('custom-main-profile');
    expect(refreshed.every((item) => item.quantity === 1)).toBeTrue();
  });
});
