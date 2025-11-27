// VST Bridge fallback implementation
export default {
  loadPlugin: async (path: string) => {
    console.log(`Mock: Loading VST plugin from ${path}`);
    return { 
      id: `mock_${Date.now()}`, 
      path,
      parameters: new Map()
    };
  },
  
  unloadPlugin: async (instance: any) => {
    console.log(`Mock: Unloading VST plugin ${instance.id}`);
  },
  
  processAudio: async (instance: any, buffer: any) => {
    // Pass-through processing for mock
    return buffer;
  },
  
  setParameter: (instance: any, paramId: string, value: number) => {
    if (instance.parameters) {
      instance.parameters.set(paramId, value);
    }
  },
  
  getParameter: (instance: any, paramId: string) => {
    return instance.parameters?.get(paramId) || 0;
  }
};
