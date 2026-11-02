import { SecurityService } from './security.service';

describe('SecurityService retired vessel policy', () => {
  let service: SecurityService;

  beforeEach(() => {
    localStorage.clear();
    service = new SecurityService();
  });

  it('excludes BB TONGKAM aliases, prefixes, and suffixed identifiers', () => {
    for (const identity of [
      'BB TONGKAM', 'BBTongkam', 'bb_tongkam', 'BB-TONGKAM', 'BB_TONGKAM-',
      'BOURBON TONGKAM', 'BourbonTongkam', 'BB_TONGKAM-SITE',
    ]) {
      expect(service.isExcludedVessel(identity)).withContext(identity).toBeTrue();
    }
    expect(service.isExcludedVessel('BB LIBERTY 233')).toBeFalse();
    expect(service.isExcludedVessel('BAHTERA INTAN')).toBeFalse();
  });

  it('never offers the retired vessel in legacy role permissions', () => {
    expect(service.getAccessibleVessels('systemadmin')).not.toContain('BB TONGKAM');
    expect(service.getAccessibleVessels('bbuser')).not.toContain('BB TONGKAM');
  });

  it('cleans outdated selections from all fleet tabs', () => {
    for (const key of ['selectedVessel', 'realtimeVessel', 'pastTrackVessel', 'reportVessel', 'activeVessel']) {
      localStorage.setItem(key, JSON.stringify({ fvInfo: { name: 'BB TONGKAM', prefix: 'BB_TONGKAM' } }));
    }
    new SecurityService();
    for (const key of ['selectedVessel', 'realtimeVessel', 'pastTrackVessel', 'reportVessel', 'activeVessel']) {
      expect(localStorage.getItem(key)).toBeNull();
    }
  });
});
