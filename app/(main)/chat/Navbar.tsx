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

const Navbar = () => {
  const [chatName, setChatName] = React.useState(
    dayjs().format("MMMM DD, YYYY") + " Untitled"
  );
  const [inputValue, setInputValue] = React.useState(chatName);

  const handleInputChange = (event: any) => {
    setInputValue(event.target.value);
  };

  const handleSave = () => {
    setChatName(inputValue);
  };

  return (
    <>
      <header className="flex h-[70px] items-center border-b border-[#E3E3E3] flex-col justify-between text-secondary -m-4 lg:-m-6 ">
        <div className="bg-[#4479FF] w-full text-center bg-opacity-[0.37] text-muted">
          🌎 join our next webinar on getting started with open source.{" "}
          <Link href={"#"} className="text-[#0267FF] underline">
            Click here
          </Link>
        </div>
        <div className="flex items-center w-full px-6 pb-2 gap-5 ">
          <Image src={"/images/msg.svg"} alt="logo" width={20} height={20} />
          <Dialog>
            <DialogTrigger>
              <p className="text-muted">{chatName}</p>
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
                  <Button type="button">cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button type="button" onClick={handleSave}>
                    save
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
