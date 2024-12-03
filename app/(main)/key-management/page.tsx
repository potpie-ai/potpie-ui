"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQuery } from "@tanstack/react-query";
import KeyManagmentService from "@/services/KeyManagment";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/configs/Firebase-config";
import { toast } from "sonner";
import UserKeys from "./components/UserKeys";
import SelectLLM from "./components/SelectLLM";

const KeyManagment = () => {
  const [selectedKey, setSelectedKey] = useState("");
  const [openKeyDialog, setOpenKeyDialog] = useState(false);
  const handleCheckboxChange = (key: string) => {
    setSelectedKey((prevKey) => (prevKey === key ? "" : key));
  };

  const setGlobalAiProvider = useMutation({
    mutationFn: (provider: string) =>
      KeyManagmentService.SetGlobalAiProvider(provider),
    onSuccess(data) {
      toast.success(data.message);
    },
  });

  return (
    <div className="flex flex-col gap-10 w-full h-full">
      <Card className="border-none shadow-none">
        <CardHeader>
          <CardTitle className="text-primary">Set Your Keys</CardTitle>
          <CardDescription>
            Select the key you want to use for generating tests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col">
            <div className="flex gap-6 items-center ">
              <div className="flex items-center gap-2 h-10">
                <Checkbox
                  disabled={setGlobalAiProvider.isPending}
                  id="potpieKey"
                  checked={selectedKey === "potpieKey"}
                  onCheckedChange={() => handleCheckboxChange("potpieKey")}
                />
                <label
                  htmlFor="potpieKey"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I want to use potpie&apos;s key
                </label>
              </div>
              <SelectLLM
                setGlobalAiProvider={setGlobalAiProvider}
              />
            </div>

            <div className="flex items-center gap-2 h-10">
              <Checkbox
                disabled={setGlobalAiProvider.isPending}
                id="UserKey"
                checked={selectedKey === "UserKey"}
                onCheckedChange={() => {
                  handleCheckboxChange("UserKey");
                  setOpenKeyDialog(true);
                }}
              />
              <label
                htmlFor="UserKey"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I want to use my key
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
      {selectedKey === "UserKey" && (
        <UserKeys
          open={openKeyDialog}
          setOpen={setOpenKeyDialog}
          setGlobalAiProvider={setGlobalAiProvider}
        />
      )}
    </div>
  );
};

export default KeyManagment;
