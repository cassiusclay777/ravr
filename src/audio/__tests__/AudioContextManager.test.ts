import { AudioContextManager } from '../AudioContextManager';

describe('AudioContextManager', () => {
  let manager: AudioContextManager;
  let closeSpy: jest.SpyInstance;

  beforeEach(() => {
    manager = new AudioContextManager();
    closeSpy = jest.spyOn(manager.context, 'close');
  });

  afterEach(async () => {
    closeSpy.mockRestore();
    if (manager) {
      await manager.dispose();
    }
  });

  it('should close AudioContext on dispose', async () => {
    await manager.dispose();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should not throw if close fails', async () => {
    closeSpy.mockImplementationOnce(() => Promise.reject(new Error('AudioContext close failed')));
    await expect(manager.dispose()).resolves.not.toThrow();
  });

  it('should not call close if context is already closed', async () => {
    // Simulate closed state
    Object.defineProperty(manager.context, 'state', {
      value: 'closed',
      writable: true
    });
    
    await manager.dispose();
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('should clean up all tracks and resources', async () => {
    const track = manager.createTrack('test-track', 'Test Track');
    const disposeSpy = jest.spyOn(track, 'dispose');
    const eqDestroySpy = jest.spyOn(manager.getEQChain(), 'destroy');
    
    await manager.dispose();
    
    expect(disposeSpy).toHaveBeenCalled();
    expect(eqDestroySpy).toHaveBeenCalled();
    expect(manager.getTracks()).toHaveLength(0);
  });
});
