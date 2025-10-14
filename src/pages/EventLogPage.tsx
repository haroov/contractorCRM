import React from 'react';
import EventLogManager from '../components/EventLog/EventLogManager';

const EventLogPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <EventLogManager />
    </div>
  );
};

export default EventLogPage;