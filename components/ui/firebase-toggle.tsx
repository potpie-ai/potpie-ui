"use client";
import React, { useEffect, useState } from 'react';
import { Button } from './button';
import { Card } from './card';

export default function FirebaseToggle() {
  const [isEnabled, setIsEnabled] = useState(false);
  
  // Check localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const status = window.localStorage.getItem('FORCE_FIREBASE_ENABLED') === 'true';
      setIsEnabled(status);
    }
  }, []);
  
  const toggleFirebase = () => {
    if (typeof window !== 'undefined') {
      const newStatus = !isEnabled;
      window.localStorage.setItem('FORCE_FIREBASE_ENABLED', newStatus ? 'true' : 'false');
      setIsEnabled(newStatus);
      
      // To apply changes immediately, reload the page
      window.location.reload();
    }
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="p-4 shadow-lg">
        <div className="flex flex-col gap-2">
          <span className="text-sm">Firebase Mode: {isEnabled ? 'Enabled' : 'Disabled'}</span>
          <Button 
            onClick={toggleFirebase}
            variant={isEnabled ? "default" : "outline"}
            size="sm"
          >
            {isEnabled ? 'Disable Firebase' : 'Enable Firebase'}
          </Button>
          <p className="text-xs text-gray-500">
            {isEnabled 
              ? 'Using real Firebase authentication' 
              : 'Using mock authentication'}
          </p>
        </div>
      </Card>
    </div>
  );
}