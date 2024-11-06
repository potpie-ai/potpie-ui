"use client";
import React from "react";
import { onIdTokenChanged, getAuth } from "firebase/auth";
import { firebase_app } from "@/configs/Firebase-config";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const auth = getAuth(firebase_app);

export const AuthContext = React.createContext<any>({
  user: null,
  userSubscription: null,
});

export const useAuthContext = () => React.useContext(AuthContext);

export const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const refreshToken = () => {
      auth.currentUser?.getIdToken(true);
    };
    const refreshInterval = setInterval(refreshToken, 50 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  React.useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user }}>
      {loading ? (
        <div className="w-full min-h-screen flex justify-center items-center">
          <Button type="button" variant={"ghost"}>
            <div className="flex flex-col gap-4 items-center justify-center text-center w-full">
              Please wait while we authenticate you
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