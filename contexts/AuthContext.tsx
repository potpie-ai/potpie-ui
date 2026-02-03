"use client";
import React from "react";
import { onIdTokenChanged } from "firebase/auth";
import { auth } from "@/configs/Firebase-config";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isFirebaseEnabled } from "@/lib/utils";

export const AuthContext = React.createContext<any>({
  user: null,
  userSubscription: null,
});

export const useAuthContext = () => React.useContext(AuthContext);

export const AuthContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
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
      // In local/mock mode, load user from localStorage
      // JSON.parse strips functions - we must restore getIdToken so layout/sidebar don't crash
      const storedUser =
        typeof window !== "undefined" ? localStorage.getItem("user") : null;
      let parsedUser = storedUser ? JSON.parse(storedUser) : null;
      if (parsedUser && typeof parsedUser.getIdToken !== "function") {
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        parsedUser = {
          ...parsedUser,
          getIdToken: async () => token || "mock-token-for-local-development",
        };
      }
      setUser(parsedUser);
      setLoading(false);

      // Listen for storage events to update user state on logout/login in other tabs
      const handleStorage = (event: StorageEvent) => {
        if (event.key === "user") {
          let newUser = event.newValue ? JSON.parse(event.newValue) : null;
          if (newUser && typeof newUser.getIdToken !== "function") {
            const token = localStorage.getItem("token");
            newUser = {
              ...newUser,
              getIdToken: async () =>
                token || "mock-token-for-local-development",
            };
          }
          setUser(newUser);
        }
      };
      window.addEventListener("storage", handleStorage);
      return () => {
        window.removeEventListener("storage", handleStorage);
      };
    }

    // Use real Firebase auth when Firebase is enabled or forced
    console.log("AuthContext: Using REAL Firebase authentication");
    const unsubscribe = onIdTokenChanged(auth, (firebaseUser) => {
      console.log(
        `AuthContext: onIdTokenChanged fired, user: ${firebaseUser ? "found" : "null"}`,
      );
      if (firebaseUser) {
        console.log(`AuthContext: User ID: ${firebaseUser.uid}`);
      }
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isFirebaseActive]);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {loading ? (
        <div className="w-full min-h-screen flex justify-center items-center">
          <Button type="button" variant={"ghost"}>
            <div className="flex flex-col gap-4 items-center justify-center text-center w-full">
              {isFirebaseActive
                ? "Please wait while we authenticate you"
                : "Initializing local development mode"}
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
