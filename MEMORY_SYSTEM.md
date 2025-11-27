# RAVR Audio Engine - Knowledge Graph Memory System

This document describes the integration of a knowledge graph-based memory system into the RAVR Audio Engine.

## Setup

The memory system uses the Model Context Protocol (MCP) to maintain a persistent knowledge graph of audio processing activities.

### Prerequisites

- Node.js and npm installed
- VS Code with MCP extension

### Installation

1. The system is already configured in `.vscode/mcp.json`
2. The memory server will start automatically when needed

## Usage

The memory system will automatically track:
- Audio file properties and metadata
- Effects and processing chains
- User preferences and common workflows
- Processing results and observations

### Interacting with Memory

Use natural language to query or update the knowledge graph. Examples:

- "Remember that I prefer using the VintageWarmer on vocal tracks"
- "What settings did I use for the drum bus compression?"
- "Find all vocal tracks processed with the DeEsser"

## Memory Structure

The knowledge graph maintains:

### Entity Types
- `AudioFile`: Audio assets being processed
- `Effect`: Audio processing units (EQ, Compressor, etc.)
- `Preset`: Saved effect configurations
- `ProcessingChain`: Ordered sequences of effects
- `Project`: Audio project containers

### Relation Types
- `processed_with`: AudioFile → Effect
- `contains`: ProcessingChain → Effect
- `uses_preset`: Effect → Preset
- `part_of`: AudioFile → Project

## Integration with RAVR Audio Engine

The memory system enhances the RAVR Audio Engine by:
1. Remembering processing chains
2. Suggesting effect settings based on past usage
3. Maintaining context between sessions
4. Enabling intelligent search and recall of audio assets

## Troubleshooting

If the memory system is not working:
1. Ensure the MCP extension is installed in VS Code
2. Check the VS Code output panel for MCP server logs
3. Restart VS Code if the server fails to start
