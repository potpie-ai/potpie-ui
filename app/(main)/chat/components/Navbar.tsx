"use client";
import Link from "next/link";
import Image from "next/image";
import dayjs from "dayjs";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/state/store";
import { setChat } from "@/lib/state/Reducers/chat";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import getHeaders from "@/app/utils/headers.util";
import { toast } from "sonner";

const Navbar = () => {
  const { title, currentConversationId } = useSelector(
    (state: RootState) => state.chat
  );
  const dispatch = useDispatch();
  const [inputValue, setInputValue] = React.useState(title);
  const handleInputChange = (event: any) => {
    setInputValue(event.target.value);
  };

  const {
    refetch: refetchChatTitle,
  } = useQuery({
    queryKey: ["chat-title"],
    queryFn: async () => {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const headers = await getHeaders();
      axios.patch(`${baseUrl}/conversations/${currentConversationId}/rename/`, {
        title: inputValue,
      }, {headers:headers}).then((res) => {
        if(res.data.status === "success") toast.success("Title updated successfully");
        return res.data;
      }).catch((err) => {
        console.log(err);
        return err.response.data;
      });
    },
    enabled: false,
  });
  const handleSave = () => {
    refetchChatTitle();
    dispatch(setChat({ title: inputValue }));
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white flex h-[70px] items-center border-b border-[#E3E3E3] flex-col justify-between text-secondary -m-4 lg:-m-6 ">
        <div className="bg-[#4479FF] w-full text-center bg-opacity-[0.37] text-muted">
          🌎 join our next webinar on getting started with open source.{" "}
          <Link href={"#"} className="text-[#0267FF] underline">
            Click here
          </Link>
        </div>
        <div className="flex items-center w-full px-6 pb-2 gap-5 ">
          <Image
            src={"/images/msg-grey.svg"}
            alt="logo"
            width={20}
            height={20}
          />
          <Dialog>
            <DialogTrigger>
              <span className="text-muted text-xl">{title}</span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[487px]" showX={false}>
              <DialogHeader>
                <DialogTitle className="text-center">
                  Edit chat name
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="  ">
                  <Input
                    id="name"
                    value={inputValue}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button type="button" onClick={handleSave}>
                    Save
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>
    </>
  );
};

export default Navbar;
