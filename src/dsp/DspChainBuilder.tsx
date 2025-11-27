import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DragDropContext, Draggable, Droppable, DropResult } from 'react-beautiful-dnd';
import styled from 'styled-components';
import { AudioContextType } from './audioTypes';
import { moduleRegistry } from './ModuleRegistry';
import { DSPModule, DSPModuleConfig, DSPModuleType } from './types';

interface DSPModuleInstance extends Omit<DSPModuleConfig, 'id' | 'params'> {
  id: string;
  instance: DSPModule | null;
  node: AudioNode | null;
  enabled: boolean;
  params: Record<string, any>;
}

interface DSPChainBuilderProps {
  context: AudioContextType;
  onChainChange: (modules: DSPModuleInstance[]) => void;
}

// Styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: #2d3748;
  border-radius: 0.5rem;
`;

const ModuleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ModuleItem = styled.div`
  background: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 0.375rem;
  overflow: hidden;
`;

const ModuleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #2d3748;
  border-bottom: 1px solid #4a5568;
  cursor: move;
`;

const ModuleActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ModuleParams = styled.div`
  padding: 1rem;
  background: #1a202c;
`;

const ParamControl = styled.div`
  margin-bottom: 0.5rem;
`;

const ModuleButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  background: #4299e1;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  &:hover {
    background: #3182ce;
  }
`;

const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  color: #a0aec0;
  background: #2d3748;
  border: 1px dashed #4a5568;
  border-radius: 0.375rem;
`;

export const DSPChainBuilder: React.FC<DSPChainBuilderProps> = ({ context, onChainChange }) => {
  const [modules, setModules] = useState<DSPModuleInstance[]>([]);
  const availableModuleTypes = useMemo(() => moduleRegistry.listModules(), []);
  const modulesRef = useRef(modules);

  // Keep ref in sync with state
  useEffect(() => {
    modulesRef.current = modules;
  }, [modules]);

  // Notify parent when modules change
  useEffect(() => {
    onChainChange(modules);
  }, [modules, onChainChange]);

  const addModuleToChain = useCallback(
    (moduleType: DSPModuleType) => {
      try {
        const moduleId = `${moduleType}-${Date.now()}`;
        // Get the module descriptor first
        const descriptor = moduleRegistry.getModuleDescriptor(moduleType);
        if (!descriptor) {
          console.error(`Module type ${moduleType} not found`);
          return;
        }
        
        // Create the module instance
        const module = descriptor.create(context, moduleId);

        if (module) {
          const newModule: DSPModuleInstance = {
            id: moduleId,
            type: moduleType,
            name: descriptor.name || moduleType,
            enabled: true,
            params: { ...descriptor.defaultParams },
            instance: module,
            node: null,
          };

          setModules((prev) => [...prev, newModule]);
        }
      } catch (error) {
        console.error('Failed to create module:', error);
      }
    },
    [context],
  );

  const removeModule = useCallback((index: number) => {
    setModules((prev) => {
      const newModules = [...prev];
      const [removed] = newModules.splice(index, 1);
      if (removed.instance) {
        removed.instance.dispose();
      }
      return newModules;
    });
  }, []);

  const updateModuleParams = useCallback((index: number, params: Record<string, any>) => {
    setModules((prev) => {
      const newModules = [...prev];
      const module = newModules[index];
      if (module && module.instance) {
        // Update the params in our state
        module.params = { ...module.params, ...params };
        // Update the module instance with the new params
        module.instance.updateParams(module.params);
      }
      return newModules;
    });
  }, []);

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    setModules((prev) => {
      const newModules = [...prev];
      const [removed] = newModules.splice(result.source.index, 1);
      newModules.splice(result.destination!.index, 0, removed);
      return newModules;
    });
  }, []);

  const toggleModuleEnabled = useCallback((index: number) => {
    setModules((prev) => {
      const newModules = [...prev];
      const module = newModules[index];
      if (module) {
        module.enabled = !module.enabled;
        if (module.instance) {
          module.instance.setEnabled(module.enabled);
        }
      }
      return newModules;
    });
  }, []);

  return (
    <Container>
      <ModuleList>
        {modules.length === 0 ? (
          <EmptyState>
            <p>No modules added yet. Click a button below to add one.</p>
          </EmptyState>
        ) : (
          <Droppable droppableId="modules">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {modules.map((module, index) => (
                  <Draggable key={module.id} draggableId={module.id} index={index}>
                    {(provided) => (
                      <ModuleItem
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                      >
                        <ModuleHeader {...provided.dragHandleProps}>
                          <h3>{module.name}</h3>
                          <ModuleActions>
                            <Button
                              onClick={() => {
                                const newModules = [...modules];
                                newModules.splice(index, 1);
                                setModules(newModules);
                              }}
                            >
                              Remove
                            </Button>
                          </ModuleActions>
                        </ModuleHeader>
                        <ModuleParams>
                          {Object.entries(module.params || {}).map(([key, value]) => (
                            <ParamControl key={key}>
                              <label>{key}</label>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={value as number}
                                onChange={(e) => {
                                  const newValue = parseFloat(e.target.value);
                                  const newModules = [...modules];
                                  newModules[index].params[key] = newValue;
                                  newModules[index].instance?.updateParams({
                                    ...newModules[index].params,
                                    [key]: newValue,
                                  });
                                  setModules(newModules);
                                }}
                              />
                            </ParamControl>
                          ))}
                        </ModuleParams>
                      </ModuleItem>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        )}
      </ModuleList>

      <ModuleButtons>
        {availableModuleTypes.map((moduleType) => {
          const type = moduleType.type as DSPModuleType;
          return (
            <Button
              key={type}
              onClick={() => addModuleToChain(type)}
            >
              Add {moduleType.name}
            </Button>
          );
        })}
      </ModuleButtons>
    </Container>
  );
};

export default DSPChainBuilder;
