"use client";
import React from "react";
import { onIdTokenChanged } from "firebase/auth";
import { auth } from "@/configs/Firebase-config";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isFirebaseEnabled, generateMockUser } from "@/lib/utils";

export const AuthContext = React.createContext<any>({
  user: null,
  userSubscription: null,
});

export const useAuthContext = () => React.useContext(AuthContext);

export const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const isFirebaseActive = isFirebaseEnabled();

  React.useEffect(() => {
    // Skip token refresh in local development mode
    if (!isFirebaseActive) {
      return;
    }
    
    const refreshToken = () => {
      auth.currentUser?.getIdToken(true);
    };
    const refreshInterval = setInterval(refreshToken, 50 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [isFirebaseActive]);

  React.useEffect(() => {
    if (!isFirebaseActive) {
      // Use mock user for local development
      setUser(generateMockUser());
      setLoading(false);
      return () => {};
    }

    // Use real Firebase auth for production
    const unsubscribe = onIdTokenChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isFirebaseActive]);

  return (
    <AuthContext.Provider value={{ user }}>
      {loading ? (
        <div className="w-full min-h-screen flex justify-center items-center">
          <Button type="button" variant={"ghost"}>
            <div className="flex flex-col gap-4 items-center justify-center text-center w-full">
              {isFirebaseActive ? "Please wait while we authenticate you" : "Initializing local development mode"}
              <LoaderCircle className="w-10 h-10 animate-spin" />
            </div>
          </Button>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};