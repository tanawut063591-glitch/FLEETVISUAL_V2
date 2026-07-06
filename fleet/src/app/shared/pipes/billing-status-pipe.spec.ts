import { BillingStatusPipe } from './billing-status-pipe';

describe('BillingStatusPipe', () => {
  it('create an instance', () => {
    const pipe = new BillingStatusPipe();
    expect(pipe).toBeTruthy();
  });
});
