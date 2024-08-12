"use client";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { UserCircle } from "lucide-react";
import Image from "next/image";

const ProfilePicture = ({ className }: { className?: string }) => {
  const { user } = useAuthContext();

  return user ? (
    user.photoURL ? (
      <img
        className={cn("w-10 h-10 rounded-full", className)}
        src={user.photoURL}
        alt="profile picture"
        width={50}
        height={50}
      />
    ) : (
      <div className={cn("w-10 h-10 rounded-full grid place-items-center bg-secondary-foreground", className)}>
        <UserCircle className="dark:text-secondary-foreground text-icons" />
      </div>
    )
  ) : (
    <Skeleton className="w-10 h-10 rounded-full bg-secondary" />
  );
};

export default ProfilePicture;
