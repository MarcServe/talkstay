/**
 * Conversation Synchronizer
 * Ensures seamless synchronization between voice and text interactions
 */

interface SyncState {
  lastVoiceMessage: string | null;
  lastTextMessage: string | null;
  pendingSync: boolean;
  syncQueue: SyncOperation[];
  conflictResolution: 'voice_priority' | 'text_priority' | 'timestamp_priority';
}

interface SyncOperation {
  id: string;
  type: 'voice_to_text' | 'text_to_voice' | 'state_sync' | 'conflict_resolution';
  source: 'voice' | 'text';
  target: 'voice' | 'text' | 'both';
  data: any;
  timestamp: number;
  priority: number;
  retryCount: number;
}

interface ConversationSync {
  messageId: string;
  content: string;
  source: 'voice' | 'text';
  timestamp: number;
  processed: boolean;
}

export class ConversationSynchronizer {
  private syncState: SyncState = {
    lastVoiceMessage: null,
    lastTextMessage: null,
    pendingSync: false,
    syncQueue: [],
    conflictResolution: 'timestamp_priority'
  };

  private conversationSyncs: Map<string, ConversationSync> = new Map();
  private subscribers: Set<(state: SyncState) => void> = new Set();
  private processingQueue = false;
  private syncTimeout: NodeJS.Timeout | null = null;

  // Voice Interface Bridge
  private voiceInterface: any = null;
  private textInterface: any = null;

  constructor() {
    this.startSyncProcessor();
  }

  // Register interfaces for bidirectional sync
  registerVoiceInterface(voiceInterface: any) {
    this.voiceInterface = voiceInterface;
    console.log('📱 Voice interface registered for sync');
  }

  registerTextInterface(textInterface: any) {
    this.textInterface = textInterface;
    console.log('💬 Text interface registered for sync');
  }

  // Core synchronization methods
  syncVoiceToText(voiceMessage: string, messageId: string, metadata?: any) {
    console.log('🎤→💬 Syncing voice message to text interface');
    
    const operation: SyncOperation = {
      id: `voice_to_text_${Date.now()}`,
      type: 'voice_to_text',
      source: 'voice',
      target: 'text',
      data: {
        message: voiceMessage,
        messageId,
        metadata: {
          ...metadata,
          source: 'voice_transcription',
          syncTimestamp: Date.now()
        }
      },
      timestamp: Date.now(),
      priority: 1,
      retryCount: 0
    };

    this.addToSyncQueue(operation);
    this.syncState.lastVoiceMessage = voiceMessage;
    this.notifySubscribers();
  }

  syncTextToVoice(textMessage: string, messageId: string, metadata?: any) {
    console.log('💬→🎤 Syncing text message to voice interface');
    
    const operation: SyncOperation = {
      id: `text_to_voice_${Date.now()}`,
      type: 'text_to_voice',
      source: 'text',
      target: 'voice',
      data: {
        message: textMessage,
        messageId,
        metadata: {
          ...metadata,
          source: 'text_input',
          syncTimestamp: Date.now()
        }
      },
      timestamp: Date.now(),
      priority: 1,
      retryCount: 0
    };

    this.addToSyncQueue(operation);
    this.syncState.lastTextMessage = textMessage;
    this.notifySubscribers();
  }

  // Bidirectional state synchronization
  syncConversationState(state: any, source: 'voice' | 'text') {
    console.log(`📊 Syncing conversation state from ${source}`);
    
    const operation: SyncOperation = {
      id: `state_sync_${Date.now()}`,
      type: 'state_sync',
      source,
      target: source === 'voice' ? 'text' : 'voice',
      data: {
        state,
        fields: ['messages', 'currentContext', 'sessionState']
      },
      timestamp: Date.now(),
      priority: 2,
      retryCount: 0
    };

    this.addToSyncQueue(operation);
  }

  // Conflict resolution
  private handleConflict(voiceOp: SyncOperation, textOp: SyncOperation): SyncOperation {
    console.log('⚡ Resolving sync conflict between voice and text operations');
    
    switch (this.syncState.conflictResolution) {
      case 'voice_priority':
        return voiceOp;
      case 'text_priority':
        return textOp;
      case 'timestamp_priority':
      default:
        return voiceOp.timestamp > textOp.timestamp ? voiceOp : textOp;
    }
  }

  // Queue management
  private addToSyncQueue(operation: SyncOperation) {
    // Check for conflicts
    const existingOp = this.syncState.syncQueue.find(op => 
      op.type === operation.type && 
      Math.abs(op.timestamp - operation.timestamp) < 1000 // Within 1 second
    );

    if (existingOp) {
      // Handle conflict
      const resolvedOp = this.handleConflict(operation, existingOp);
      this.syncState.syncQueue = this.syncState.syncQueue.filter(op => op.id !== existingOp.id);
      this.syncState.syncQueue.push(resolvedOp);
    } else {
      this.syncState.syncQueue.push(operation);
    }

    // Sort by priority and timestamp
    this.syncState.syncQueue.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.timestamp - b.timestamp;
    });

    this.syncState.pendingSync = true;
    this.processQueue();
  }

  private async processQueue() {
    if (this.processingQueue || this.syncState.syncQueue.length === 0) {
      return;
    }

    this.processingQueue = true;
    console.log(`🔄 Processing sync queue (${this.syncState.syncQueue.length} operations)`);

    while (this.syncState.syncQueue.length > 0) {
      const operation = this.syncState.syncQueue.shift()!;
      
      try {
        await this.executeOperation(operation);
        console.log(`✅ Sync operation completed: ${operation.id}`);
      } catch (error) {
        console.error(`❌ Sync operation failed: ${operation.id}`, error);
        
        // Retry logic
        if (operation.retryCount < 3) {
          operation.retryCount++;
          operation.timestamp = Date.now() + (1000 * operation.retryCount); // Exponential backoff
          this.syncState.syncQueue.unshift(operation);
          console.log(`🔄 Retrying sync operation: ${operation.id} (attempt ${operation.retryCount + 1})`);
        } else {
          console.error(`🚨 Sync operation permanently failed: ${operation.id}`);
        }
      }

      // Small delay between operations
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.syncState.pendingSync = false;
    this.processingQueue = false;
    this.notifySubscribers();
  }

  private async executeOperation(operation: SyncOperation): Promise<void> {
    switch (operation.type) {
      case 'voice_to_text':
        await this.executeVoiceToTextSync(operation);
        break;
      case 'text_to_voice':
        await this.executeTextToVoiceSync(operation);
        break;
      case 'state_sync':
        await this.executeStateSync(operation);
        break;
      case 'conflict_resolution':
        await this.executeConflictResolution(operation);
        break;
    }
  }

  private async executeVoiceToTextSync(operation: SyncOperation): Promise<void> {
    if (!this.textInterface) {
      throw new Error('Text interface not registered');
    }

    // Sync voice message to text interface
    const { message, messageId, metadata } = operation.data;
    
    // Add message to text interface with voice source indicator
    if (typeof this.textInterface.addMessage === 'function') {
      this.textInterface.addMessage({
        id: messageId,
        text: message,
        sender: metadata?.sender || 'user',
        timestamp: new Date(),
        source: 'voice',
        synced: true
      });
    }

    // Record successful sync
    this.conversationSyncs.set(messageId, {
      messageId,
      content: message,
      source: 'voice',
      timestamp: Date.now(),
      processed: true
    });
  }

  private async executeTextToVoiceSync(operation: SyncOperation): Promise<void> {
    if (!this.voiceInterface) {
      throw new Error('Voice interface not registered');
    }

    // Sync text message to voice interface
    const { message, messageId, metadata } = operation.data;
    
    // Add message to voice interface with text source indicator
    if (typeof this.voiceInterface.addMessage === 'function') {
      this.voiceInterface.addMessage({
        id: messageId,
        text: message,
        sender: metadata?.sender || 'user',
        timestamp: new Date(),
        source: 'text',
        synced: true
      });
    }

    // Record successful sync
    this.conversationSyncs.set(messageId, {
      messageId,
      content: message,
      source: 'text',
      timestamp: Date.now(),
      processed: true
    });
  }

  private async executeStateSync(operation: SyncOperation): Promise<void> {
    const { state, fields } = operation.data;
    
    // Sync specific state fields between interfaces
    for (const field of fields) {
      if (operation.target === 'voice' && this.voiceInterface) {
        if (typeof this.voiceInterface.updateState === 'function') {
          this.voiceInterface.updateState(field, state[field]);
        }
      } else if (operation.target === 'text' && this.textInterface) {
        if (typeof this.textInterface.updateState === 'function') {
          this.textInterface.updateState(field, state[field]);
        }
      }
    }
  }

  private async executeConflictResolution(operation: SyncOperation): Promise<void> {
    // Handle conflict resolution between competing operations
    const { conflictData } = operation.data;
    console.log('🔄 Executing conflict resolution:', conflictData);
  }

  // Smart sync features
  detectSyncGaps(): { gaps: string[], recommendations: string[] } {
    const gaps: string[] = [];
    const recommendations: string[] = [];
    
    // Check for unsynchronized messages
    const unsynced = Array.from(this.conversationSyncs.values()).filter(sync => !sync.processed);
    if (unsynced.length > 0) {
      gaps.push(`${unsynced.length} messages pending synchronization`);
      recommendations.push('Process pending sync operations');
    }

    // Check sync queue backlog
    if (this.syncState.syncQueue.length > 5) {
      gaps.push('Large sync queue backlog detected');
      recommendations.push('Reduce message frequency or optimize sync processing');
    }

    return { gaps, recommendations };
  }

  optimizeSync() {
    console.log('🔧 Optimizing conversation synchronization...');
    
    // Clear old sync records
    const cutoffTime = Date.now() - (5 * 60 * 1000); // 5 minutes ago
    for (const [id, sync] of this.conversationSyncs.entries()) {
      if (sync.timestamp < cutoffTime) {
        this.conversationSyncs.delete(id);
      }
    }

    // Prioritize recent operations
    this.syncState.syncQueue.sort((a, b) => b.timestamp - a.timestamp);
    
    console.log(`✅ Sync optimization complete. ${this.conversationSyncs.size} active syncs.`);
  }

  // Subscription management
  subscribe(callback: (state: SyncState) => void): () => void {
    this.subscribers.add(callback);
    callback(this.syncState); // Immediate update
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback({ ...this.syncState }));
  }

  // Auto-sync processor
  private startSyncProcessor() {
    this.syncTimeout = setInterval(() => {
      if (this.syncState.syncQueue.length > 0) {
        this.processQueue();
      }
      
      // Periodic optimization
      if (Math.random() < 0.1) { // 10% chance every interval
        this.optimizeSync();
      }
    }, 2000); // Every 2 seconds
  }

  // Configuration
  setConflictResolution(strategy: SyncState['conflictResolution']) {
    this.syncState.conflictResolution = strategy;
    console.log(`📊 Conflict resolution strategy set to: ${strategy}`);
  }

  // Cleanup
  destroy() {
    if (this.syncTimeout) {
      clearInterval(this.syncTimeout);
      this.syncTimeout = null;
    }
    
    this.syncState.syncQueue = [];
    this.conversationSyncs.clear();
    this.subscribers.clear();
    this.voiceInterface = null;
    this.textInterface = null;
    
    console.log('🧹 Conversation synchronizer destroyed');
  }

  // Public API
  getSyncState(): SyncState {
    return { ...this.syncState };
  }

  getSyncHistory(): ConversationSync[] {
    return Array.from(this.conversationSyncs.values());
  }

  getPendingOperations(): SyncOperation[] {
    return [...this.syncState.syncQueue];
  }

  forceSyncAll() {
    console.log('🔄 Forcing synchronization of all pending operations...');
    this.processQueue();
  }

  clearSync() {
    this.syncState.syncQueue = [];
    this.syncState.pendingSync = false;
    this.conversationSyncs.clear();
    this.notifySubscribers();
    console.log('🧹 All sync operations cleared');
  }
}

export const conversationSynchronizer = new ConversationSynchronizer();