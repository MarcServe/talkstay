// Message queue processor for voice conversations to ensure proper ordering
export class MessageQueueProcessor {
  private static instance: MessageQueueProcessor;
  private isProcessing = false;
  private queue: Array<{id: string, type: 'user' | 'assistant', content: string, responseId?: string}> = [];
  private listeners: Array<(message: any) => void> = [];

  static getInstance(): MessageQueueProcessor {
    if (!MessageQueueProcessor.instance) {
      MessageQueueProcessor.instance = new MessageQueueProcessor();
    }
    return MessageQueueProcessor.instance;
  }

  addToQueue(item: {id: string, type: 'user' | 'assistant', content: string, responseId?: string}) {
    this.queue.push(item);
    this.processNext();
  }

  addListener(callback: (message: any) => void) {
    this.listeners.push(callback);
  }

  removeListener(callback: (message: any) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    try {
      const item = this.queue.shift();
      if (item) {
        // Notify all listeners
        this.listeners.forEach(listener => {
          try {
            listener(item);
          } catch (error) {
            console.error('Error in message queue listener:', error);
          }
        });
        
        // Add small delay to ensure proper ordering
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error processing message queue:', error);
    } finally {
      this.isProcessing = false;
      
      // Process next item if available
      if (this.queue.length > 0) {
        setTimeout(() => this.processNext(), 50);
      }
    }
  }

  clear() {
    this.queue = [];
    this.isProcessing = false;
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

export const messageQueueProcessor = MessageQueueProcessor.getInstance();