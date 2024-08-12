import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePathname, useSearchParams } from "next/navigation";
import { emptyFooter } from "@/lib/Constants";
import { RootState } from "@/lib/state/store";
import { useSelector } from "react-redux";

const Footer = () => {
  const params = useSearchParams();
  const activePathname = usePathname();
  const shouldShowFooter =
    activePathname !== "/" && !emptyFooter.includes(activePathname);
  const flowName = useSelector((state: RootState  ) => state.flow.value);
  const selectedFlow = flowName ?  decodeURIComponent(flowName) :params.get("endpointName") ;

  if (!shouldShowFooter) {
    return null;
  }
  
  const getBreadcrumbItems = () => {
    const pathSegments = [
      selectedFlow?.split(":")[0].split("/")[1],
      selectedFlow?.split(":")[1],
    ];

    return pathSegments.map((item, index) => {
      const itemName = item;

      return (
        <React.Fragment key={index}>
          <BreadcrumbItem>
            <BreadcrumbPage className="text-primary font-bold">
              {/* {decodeURIComponent(itemName)} */}
              {itemName}
            </BreadcrumbPage>
          </BreadcrumbItem>
          {index !== pathSegments.length - 1 && (
            <BreadcrumbSeparator />
          )}
        </React.Fragment>
      );
    });
  };
  return (
    <div
      className={`w-full h-auto border border-b-0 border-border max-h-12 bg-muted py-1.5 bottom-0 fixed`}
    >
      <Breadcrumb className="pl-2">
        <BreadcrumbList>{getBreadcrumbItems()}</BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};

export default Footer;
