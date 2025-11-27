import { ParametricEQ, EQBand } from '../ParametricEQ';

describe('ParametricEQ memoization', () => {
  let ctx: AudioContext;
  let eq: ParametricEQ;

  beforeEach(() => {
    ctx = new AudioContext();
    eq = new ParametricEQ(ctx, 3);
  });

  afterEach(async () => {
    eq.dispose();
    await ctx.close();
  });

  it('should not update band if values are unchanged', () => {
    const spy = jest.spyOn(eq['bands'][0].frequency, 'setTargetAtTime');
    eq.setBand(0, { frequency: 100 });
    spy.mockClear();
    eq.setBand(0, { frequency: 100 });
    expect(spy).not.toHaveBeenCalled();
  });

  it('should update band only if values change', () => {
    const spy = jest.spyOn(eq['bands'][0].gain, 'setTargetAtTime');
    eq.setBand(0, { gain: 0 });
    spy.mockClear();
    eq.setBand(0, { gain: 5 });
    expect(spy).toHaveBeenCalledWith(5, expect.any(Number), 0.01);
  });

  it('should initialize with correct default frequencies', () => {
    const config = eq.getConfig();
    expect(config).toHaveLength(3);
    expect(config[0].frequency).toBe(31);
    expect(config[1].frequency).toBe(63);
    expect(config[2].frequency).toBe(125);
  });

  it('should not update Q value if unchanged', () => {
    const spy = jest.spyOn(eq['bands'][1].Q, 'setTargetAtTime');
    eq.setBand(1, { q: 0.7 }); // Same as default
    expect(spy).not.toHaveBeenCalled();
  });

  it('should handle enabled/disabled state properly', () => {
    const gainSpy = jest.spyOn(eq['bands'][0].gain, 'setTargetAtTime');
    
    // Set gain first
    eq.setBand(0, { gain: 6 });
    gainSpy.mockClear();
    
    // Disable band - should set gain to 0
    eq.setBand(0, { enabled: false });
    expect(gainSpy).toHaveBeenCalledWith(0, expect.any(Number), 0.01);
    
    gainSpy.mockClear();
    
    // Enable band - should restore original gain
    eq.setBand(0, { enabled: true });
    expect(gainSpy).toHaveBeenCalledWith(6, expect.any(Number), 0.01);
  });

  it('should reset all bands to zero gain', () => {
    const spies = eq['bands'].map(band => jest.spyOn(band.gain, 'setTargetAtTime'));
    
    eq.reset();
    
    spies.forEach(spy => {
      expect(spy).toHaveBeenCalledWith(0, expect.any(Number), 0.01);
    });
  });
});
