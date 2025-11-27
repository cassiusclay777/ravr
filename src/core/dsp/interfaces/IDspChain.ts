/**
 * DSP Chain Interface
 *
 * Manages an ordered chain of DSP nodes.
 * Inspired by foobar2000's DSP Manager.
 */

import type { IDspNode, DspNodeConfig, DspNodeType } from './IDspNode';

export interface IDspChain {
  /**
   * Chain identifier
   */
  readonly id: string;

  /**
   * Chain name
   */
  name: string;

  /**
   * Is chain enabled
   */
  enabled: boolean;

  /**
   * Get all nodes in order
   */
  getNodes(): IDspNode[];

  /**
   * Add node to the end of chain
   */
  addNode(node: IDspNode): void;

  /**
   * Insert node at specific position
   */
  insertNode(node: IDspNode, index: number): void;

  /**
   * Remove node by ID
   */
  removeNode(nodeId: string): void;

  /**
   * Move node to new position (for drag & drop)
   */
  moveNode(nodeId: string, newIndex: number): void;

  /**
   * Get node by ID
   */
  getNode(nodeId: string): IDspNode | undefined;

  /**
   * Replace node
   */
  replaceNode(nodeId: string, newNode: IDspNode): void;

  /**
   * Clear all nodes
   */
  clear(): void;

  /**
   * Enable/disable specific node
   */
  setNodeEnabled(nodeId: string, enabled: boolean): void;

  /**
   * Process audio through entire chain
   * @param input - Input audio buffer
   * @param channels - Number of channels
   * @param sampleRate - Sample rate
   * @returns Processed buffer
   */
  process(
    input: Float32Array,
    channels: number,
    sampleRate: number
  ): Float32Array;

  /**
   * Initialize all nodes
   */
  initialize(sampleRate: number, maxChannels: number): void;

  /**
   * Reset all nodes
   */
  reset(): void;

  /**
   * Get total CPU usage of chain
   */
  getCpuUsage(): number;

  /**
   * Serialize entire chain
   */
  serialize(): DspChainConfig;

  /**
   * Deserialize and apply configuration
   */
  deserialize(config: DspChainConfig): void;

  /**
   * Clone chain
   */
  clone(): IDspChain;

  /**
   * Subscribe to chain events
   */
  on(event: DspChainEvent, callback: DspChainEventCallback): void;
  off(event: DspChainEvent, callback: DspChainEventCallback): void;

  /**
   * Dispose all nodes and resources
   */
  dispose(): void;
}

/**
 * DSP Chain Configuration
 */
export interface DspChainConfig {
  id: string;
  name: string;
  enabled: boolean;
  nodes: DspNodeConfig[];
}

/**
 * DSP Chain Events
 */
export type DspChainEvent =
  | 'nodeAdded'
  | 'nodeRemoved'
  | 'nodeMoved'
  | 'nodeEnabled'
  | 'nodeDisabled'
  | 'chainCleared'
  | 'parametersChanged';

export type DspChainEventCallback = (data?: any) => void;

/**
 * DSP Chain Builder (Factory pattern)
 */
export interface IDspChainBuilder {
  /**
   * Create new empty chain
   */
  createChain(name: string): IDspChain;

  /**
   * Create chain from configuration
   */
  createFromConfig(config: DspChainConfig): IDspChain;

  /**
   * Create chain from preset
   */
  createFromPreset(presetName: string): IDspChain;

  /**
   * Register node factory
   */
  registerNodeFactory(type: DspNodeType, factory: DspNodeFactory): void;

  /**
   * Create node by type
   */
  createNode(type: DspNodeType, name?: string): IDspNode;
}

/**
 * Node factory function
 */
export type DspNodeFactory = (name?: string) => IDspNode;
