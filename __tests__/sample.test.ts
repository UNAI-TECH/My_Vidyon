describe('Sample Project Test Suite', () => {
  it('verifies test runner is functioning properly', () => {
    expect(1 + 1).toBe(2);
  });

  it('validates basic object matching', () => {
    const appInfo = { name: 'My Vidyon', ready: true };
    expect(appInfo).toHaveProperty('name', 'My Vidyon');
    expect(appInfo.ready).toBe(true);
  });
});
