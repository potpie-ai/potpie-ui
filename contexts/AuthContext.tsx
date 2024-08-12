"use client";
import React from "react";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { firebase_app } from "@/configs/Firebase-config";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

import axios from "axios";
import { useQuery } from "@tanstack/react-query";

const auth = getAuth(firebase_app);

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
  const [userSubscription, setUserSubscription] = React.useState<any>(null);

  const { data } = useQuery({
    queryKey: ["user-subscription", user?.uid],
    queryFn: () =>
      axios
        .get(`${process.env.NEXT_PUBLIC_PADDLE_SERVER}/user-subs`, {
          params: { userId: user?.uid },
        })
        .then((res) => {
          return res.data;
        }),
    enabled: !!user?.uid,
  });

  React.useEffect(() => {
    if (data) {
      setUserSubscription(data);
    }
  }, [data]);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userSubscription }}>
      {loading ? (
        <div className="w-full min-h-screen flex justify-center items-center">
          <Button className="" type="button" variant={"ghost"}>
            <div className="flex flex-col gap-4 items-center justify-center text-center w-full ">
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
