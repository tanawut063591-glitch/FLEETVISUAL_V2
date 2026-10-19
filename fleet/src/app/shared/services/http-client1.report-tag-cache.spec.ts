import { firstValueFrom, of, Subject } from 'rxjs';
import { NewHttpClientService } from './http-client1.service';

/** No network: verifies one slot for duplicate lookups and actual force refresh. */
describe('NewHttpClientService completed Report tag request cache', () => {
  let service: NewHttpClientService;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const earlier = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
  const midnight = new Date(earlier.getFullYear(), earlier.getMonth(), earlier.getDate() + 1, 0, 0, 0);
  const stamp = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ` +
    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;

  let previousToken: string | null;
  beforeEach(() => {
    previousToken = localStorage.getItem('vesselToken2');
    localStorage.setItem('vesselToken2', 'report-cache-test-session');
    service = new NewHttpClientService({} as any, {} as any, {} as any, {} as any);
  });
  afterEach(() => {
    if (previousToken === null) localStorage.removeItem('vesselToken2');
    else localStorage.setItem('vesselToken2', previousToken);
  });

  it('shares the same in-flight request, caches only its successful result and bypasses it on refresh', async () => {
    const response = new Subject<unknown>();
    const network = spyOn<any>(service, 'requestSingleLoggerFromSource').and.returnValue(response.asObservable());
    const query = () => (service as any).getSharedReportTagSeries('api2', stamp(earlier), stamp(midnight), 'TEST_TAG');

    const first = firstValueFrom(query());
    const second = firstValueFrom(query());
    expect(network).toHaveBeenCalledTimes(1);
    response.next([{ TimeStamp: stamp(earlier), Value: 12 }]);
    response.complete();
    const [a, b] = await Promise.all([first, second]);
    expect(a).toEqual(b);
    expect(a.Records.length).toBe(1);
    await firstValueFrom(query());
    expect(network).toHaveBeenCalledTimes(1);

    network.and.returnValue(of([{ TimeStamp: stamp(earlier), Value: 25 }]));
    const fresh = await firstValueFrom(
      (service as any).getSharedReportTagSeries('api2', stamp(earlier), stamp(midnight), 'TEST_TAG', true),
    );
    expect(network).toHaveBeenCalledTimes(2);
    expect(fresh.Records[0].Value).toBe(25);
    const updated = await firstValueFrom(query());
    expect(updated.Records[0].Value).toBe(25);
    expect(network).toHaveBeenCalledTimes(2);
  });

  it('does not share values across different historian sources', async () => {
    const network = spyOn<any>(service, 'requestSingleLoggerFromSource')
      .and.returnValue(of([{ TimeStamp: stamp(earlier), Value: 12 }]));
    await firstValueFrom((service as any).getSharedReportTagSeries('report', stamp(earlier), stamp(midnight), 'TEST_TAG'));
    await firstValueFrom((service as any).getSharedReportTagSeries('api2', stamp(earlier), stamp(midnight), 'TEST_TAG'));
    expect(network).toHaveBeenCalledTimes(2);
  });
});
