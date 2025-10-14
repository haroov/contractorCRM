const EventEmitter = require('events');

class EventBus extends EventEmitter {
  emitEvent(eventName, payload) {
    try {
      super.emit(eventName, payload);
    } catch (error) {
      // Avoid throwing from event handlers
      console.error('Audit EventBus emit error:', error);
    }
  }
}

const eventBus = new EventBus();

module.exports = { eventBus };
