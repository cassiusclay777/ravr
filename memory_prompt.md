# RAVR Audio Engine Memory System

## Memory Management Instructions

Follow these steps for each interaction:

1. **Audio Project Context**:
   - Always maintain awareness of the RAVR Audio Engine context
   - Track important entities like audio files, effects, and processing chains

2. **Memory Retrieval**:
   - At the start of each session, retrieve relevant audio processing context
   - Maintain awareness of the current audio workspace state

3. **Memory Categories**:
   - **Audio Files**: Track properties like format, duration, sample rate
   - **Effects Chain**: Remember processing chain configurations
   - **User Preferences**: Store user's preferred settings and workflows
   - **Common Tasks**: Remember frequently used processing chains
   - **Project Structure**: Keep track of project organization

4. **Memory Update**:
   - When new audio processing is performed, update the knowledge graph
   - Create entities for:
     - Audio files with their properties
     - Effects and their configurations
     - Processing chains and their parameters
   - Create relationships between these entities
   - Store processing results and observations

5. **Example Entities and Relations**:
   - Entity: AudioFile "vocal_take_1.wav"
     - Properties: format=WAV, duration=3:45, sampleRate=44100
   - Entity: Effect "Reverb"
     - Properties: type=reverb, decay=2.5, mix=25%
   - Relation: "processed_with" between AudioFile and Effect
   - Entity: ProcessingChain "VocalMastering"
     - Properties: created=2024-03-15, description="Vocal processing chain"
   - Relation: "contains" between ProcessingChain and Effect
