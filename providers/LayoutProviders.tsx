"use client";
import Loading from "@/app/loading";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HeaderProvider } from "@/contexts/HeaderContext";
import { TutorialProvider } from "@/contexts/JoyrideContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { store, persistor } from "@/lib/state/store";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

const LayoutProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <PersistGate loading={<Loading />} persistor={persistor}>
      <Provider store={store}>
        <TutorialProvider>
          <TooltipProvider>
            <SidebarProvider>
              <HeaderProvider>{children}</HeaderProvider>
            </SidebarProvider>
          </TooltipProvider>
        </TutorialProvider>
      </Provider>
    </PersistGate>
  );
};

export default LayoutProviders;
