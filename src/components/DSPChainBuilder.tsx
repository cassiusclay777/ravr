import { useRef, useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { ModuleInfo } from "@/dsp/ModuleRegistry";
import { DSPModuleType } from "@/dsp/types";
import { AudioContext } from "standardized-audio-context";
import styled from "styled-components";

// Add type for styled-components props
interface ChainItemProps {
  $isDragging?: boolean;
}

// Types
export interface DSPModuleInstance {
  id: string;
  type: DSPModuleType;
  name: string;
  enabled: boolean;
  params?: Record<string, any>;
}

interface DSPChainBuilderProps {
  context: AudioContext;
  onChainChange: (modules: DSPModuleInstance[]) => void;
}

// Styled components (simplified - you might need to adjust based on your styling solution)
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SectionTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
`;

const ModuleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 100px;
  padding: 1rem;
  background-color: #f5f5f5;
  border-radius: 4px;
`;

const ModuleItem = styled.div`
  padding: 0.5rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: move;
`;

const ChainList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 200px;
  padding: 1rem;
  background-color: #f0f0f0;
  border-radius: 4px;
`;

const ChainItem = styled.div<{ $isDragging?: boolean }>`
  padding: 0.75rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  opacity: ${props => (props.$isDragging ? 0.8 : 1)};
  box-shadow: ${props => (props.$isDragging ? '0 4px 6px rgba(0,0,0,0.1)' : 'none')};
`;

const ModuleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const ModuleControls = styled.div`
  display: flex;
  gap: 1rem;
`;

const Button = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0 0.5rem;
  color: #666;
  
  &:hover {
    color: #333;
  }
`;

const EmptyState = styled.div`
  padding: 1rem;
  text-align: center;
  color: #666;
  font-style: italic;
`;

export const DSPChainBuilder: React.FC<DSPChainBuilderProps> = ({ context, onChainChange }) => {
  const [modules, setModules] = useState<DSPModuleInstance[]>([]);
  const availableModules = useRef<ModuleInfo[]>([]);
  const modulesEndRef = useRef<HTMLDivElement>(null);

  // Initialize available modules
  useEffect(() => {
    // This should be populated from your module registry
    availableModules.current = [
      { type: 'compressor', name: 'Compressor' } as ModuleInfo,
      { type: 'eq', name: 'Equalizer' } as ModuleInfo,
      { type: 'reverb', name: 'Reverb' } as ModuleInfo,
      { type: 'delay', name: 'Delay' } as ModuleInfo,
      { type: 'distortion', name: 'Distortion' } as ModuleInfo,
      { type: 'filter', name: 'Filter' } as ModuleInfo,
    ];
  }, []);

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    // Dropped outside the list
    if (!destination) return;

    // Reorder modules
    if (source.droppableId === 'chain' && destination.droppableId === 'chain') {
      const newModules = Array.from(modules);
      const [moved] = newModules.splice(source.index, 1);
      newModules.splice(destination.index, 0, moved);
      setModules(newModules);
      onChainChange(newModules);
    }
    // Add new module to chain
    else if (source.droppableId === 'modules' && destination.droppableId === 'chain') {
      const module = availableModules.current[source.index];
      if (!module) return;
      
      const moduleType = module.type;
      const newModule: DSPModuleInstance = {
        id: `module-${Date.now()}`,
        type: moduleType,
        name: availableModules.current.find(m => m.type === moduleType)?.name || moduleType,
        enabled: true,
      };
      const newModules = [...modules];
      newModules.splice(destination.index, 0, newModule);
      setModules(newModules);
      onChainChange(newModules);
    }
  };

  const removeModule = (index: number) => {
    const newModules = [...modules];
    newModules.splice(index, 1);
    setModules(newModules);
    onChainChange(newModules);
  };

  const toggleModule = (index: number, enabled: boolean) => {
    const newModules = [...modules];
    newModules[index] = { ...newModules[index], enabled };
    setModules(newModules);
    onChainChange(newModules);
  };

  return (
    <Container>
      <DragDropContext onDragEnd={onDragEnd}>
        <div>
          <SectionTitle>Available Modules</SectionTitle>
          <Droppable droppableId="modules" direction="horizontal">
            {(provided) => (
              <ModuleList ref={provided.innerRef} {...provided.droppableProps}>
                {availableModules.current.map((module, index) => (
                  <Draggable key={module.type} draggableId={module.type} index={index}>
                    {(provided) => (
                      <ModuleItem
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        {module.name}
                      </ModuleItem>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ModuleList>
            )}
          </Droppable>
        </div>

        <div>
          <SectionTitle>Effect Chain</SectionTitle>
          <Droppable droppableId="chain" direction="vertical">
            {(provided) => (
              <ChainList ref={provided.innerRef} {...provided.droppableProps}>
                {modules.map((module, index) => (
                  <Draggable key={module.id} draggableId={module.id} index={index}>
                    {(provided, snapshot) => (
                      <ChainItem
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        $isDragging={snapshot.isDragging}
                      >
                        <ModuleHeader>
                          <span {...provided.dragHandleProps} style={{ cursor: 'grab' }}>
                            {module.name}
                          </span>
                          <Button
                            onClick={() => removeModule(index)}
                            title="Remove module"
                          >
                            ×
                          </Button>
                        </ModuleHeader>
                        <ModuleControls>
                          <label>
                            <input
                              type="checkbox"
                              checked={module.enabled}
                              onChange={(e) => toggleModule(index, e.target.checked)}
                            />
                            Enabled
                          </label>
                        </ModuleControls>
                      </ChainItem>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                {modules.length === 0 && (
                  <EmptyState>Drag modules here to build your effect chain</EmptyState>
                )}
              </ChainList>
            )}
          </Droppable>
        </div>
      </DragDropContext>
    </Container>
  );
};

export default DSPChainBuilder;
