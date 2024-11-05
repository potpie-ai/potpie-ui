"use client";
import React from "react";
import { onIdTokenChanged, getAuth } from "firebase/auth";
import { firebase_app } from "@/configs/Firebase-config";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";

const auth = getAuth(firebase_app);

export const AuthContext = React.createContext<any>({
  user: null,
  userSubscription: null,
});

export const useAuthContext = () => React.useContext(AuthContext);

const fetchUserSubscription = async (userId: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_SUBSCRIPTION_BASE_URL;
  const response = await axios.get(`${baseUrl}/subscriptions/info?user_id=${userId}`);
  return response.data;
};

const useUserSubscription = (userId: string | null) => {
  return useQuery({
    queryKey: ["userSubscription", userId],
    queryFn: () => fetchUserSubscription(userId as string),
    enabled: !!userId,
    retry: false,
  });
};

export const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const { data: userSubscription, isLoading: subscriptionLoading } = useUserSubscription(user?.uid);

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
    <AuthContext.Provider value={{ user, userSubscription, subscriptionLoading }}>
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