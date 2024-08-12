"use client ";
import { MenuItems } from "@/lib/Constants";
import { usePathname } from "next/navigation";
import React, { createContext, useState, useContext, useEffect } from "react";

interface HeaderContextType {
  headerTitle: string;
  setHeaderTitle: React.Dispatch<React.SetStateAction<string>>;
}

const HeaderContext = createContext<HeaderContextType>({
  headerTitle: "",
  setHeaderTitle: () => {},
});

export const HeaderProvider: any = ({ children }: any) => {
  const [headerTitle, setHeaderTitle] = useState("");
  const path = usePathname().split("/");
  useEffect(() => {
    if (
      path.includes(MenuItems.map((e) => e.link.split("/").pop()).join("/"))
    ) {
      setHeaderTitle(
        path[path.indexOf(MenuItems.map((e) => e.title).join("/")) + 1]
      );
    }
  }, [path]);
  return (
    <HeaderContext.Provider value={{ headerTitle, setHeaderTitle }}>
      {children}
    </HeaderContext.Provider>
  );
};

export const useHeader = (): HeaderContextType => {
  return useContext(HeaderContext);
};
