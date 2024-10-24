"use client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, InfoIcon } from "lucide-react";
import { useRouter } from "next/navigation";

const GlobalError = ({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) => {
  const router = useRouter()
  return (
    <section className="bg-white ">
      <div className="container flex items-center min-h-screen px-6 py-12 mx-auto">
        <div className="flex flex-col items-center max-w-sm mx-auto text-center">
          <p className="p-3 text-sm font-medium text-blue-500 rounded-full bg-blue-50 ">
            <InfoIcon />
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-gray-800 md:text-3xl">
            {title ?? "An unexpected error has occurred"}
          </h1>
          <p className="mt-4 text-gray-500 ">
            {description ?? "Please try again later."}
          </p>

          <div className="flex items-center w-full mt-6 gap-x-3 shrink-0 sm:w-auto">
            <Button className="flex items-center justify-center w-1/2 px-5 py-2 text-sm text-muted transition-colors duration-200 bg-white border rounded-lg gap-x-2 sm:w-auto  hover:bg-gray-100" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5 " />

              <span>Go back</span>
            </Button>

            <Button className="w-1/2 px-5 py-2 text-sm tracking-wide transition-colors duration-200 rounded-lg shrink-0 sm:w-auto" onClick={() => router.push("/")}>
              Take me home
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GlobalError;
