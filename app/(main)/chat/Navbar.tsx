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
import { Label } from "@/components/ui/label";
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
        <div className="bg-[#4479FF] w-full text-center bg-opacity-[0.37]">
          🌎 join our next webinar on getting started with open source.{" "}
          <Link href={"#"} className="text-[#0267FF] underline">
            Click here
          </Link>
        </div>
        <div className="flex items-center w-full px-6 pb-2 gap-5 ">
          <Image src={"/images/msg.svg"} alt="logo" width={20} height={20} />
          <Dialog>
            <DialogTrigger>
              <p>{chatName}</p>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit name</DialogTitle>
                <DialogDescription>
                  Make changes to your chat here. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
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
                  <Button type="button" onClick={handleSave}>
                    Save changes
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
