"use client";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function SetupComplete() {

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.close();
      }, 5000); 
    }
  }, []);

    const closeWindow = () => {
      window.close();
    };

    // TODO: Implement post message here on redirect with installation id and retrigger api call to pull repos
  
  return (
    <div>
      <h1 className="text-primary font-bold text-2xl px-10 pt-10">Setup Complete</h1>
      <span className="px-10 pt-4" >Your setup is complete, this window will close automatically.</span>
      <div className="px-10 mt-6">
      <Button variant="outline" onClick={()=>closeWindow()}>
        Close Now
      </Button>
      </div>
    </div>
  );
}
