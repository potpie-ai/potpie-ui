"use client";
import React, { useEffect, useRef, useState } from "react";
import { Card} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { usePostHog } from "posthog-js/react";
import { useDispatch } from "react-redux";
import { setbranch } from "@/lib/state/Reducers/branch";

const MyProjects = () => {
  const { user } = useAuthContext();
  const dispatch = useDispatch();
  const githubAppUrl =
    "https://github.com/apps/" +
    process.env.NEXT_PUBLIC_GITHUB_APP_NAME +
    "/installations/select_target?setup_action=install";
  useEffect(() => {
    dispatch(setbranch(""));
  });
  interface Endpoint {
    identifier: string;
    entryPoint: string;
  }
  
  const posthog = usePostHog();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const popupRef = useRef<Window | null>(null);
  const openPopup = () => {
    posthog.capture("github login clicked");
    popupRef.current = window.open(
      githubAppUrl,
      "_blank",
      "width=1000,height=700"
    );
  };

  useEffect(() => {
    if (user) {
      // Identify the user in PostHog
      posthog.identify(user.email, {
        email: user.email,
        name: user.displayName,
        // TODO: Additional user properties can be set here
      });
    }
  }, [posthog, user]);

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture("$pageview", {
        $current_url: url,
        $current_user: user,
      });
    }
  }, [user, pathname, searchParams, posthog]);

  useEffect(() => {
    /*
    This method listens for messages from the opened window,
    currently this is not doing anything but implement passing of install_id here
    and reload repositories on home page
    */
    // sessionStorage.removeItem("project_info");
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
    };
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <div className="flex flex-col mt-4 space-y-10 px-7">
      <div className="ml-2">
        <h1 className="text-primary font-bold text-2xl">
          Hello {user.displayName}!
        </h1>
      </div>
      <div className="w-full -ml-4 h-full flex flex-wrap gap-10">
        <Card
          onClick={() => openPopup()}
          className={`scale-90 h-[14rem] bg-card cursor-pointer w-[23rem] border-2 grid place-items-center rounded-b-sm rounded-sm border-input`}
        >
          <span className="pl-8">CLICK HERE TO TEST SAMPLE APP INSTALLATION</span>
        </Card>

      </div>
    </div>
  );
};

export default MyProjects;
