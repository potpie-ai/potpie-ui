"use client";
import { useAuthContext } from "@/contexts/AuthContext";
import React from "react";

const MyAccount = () => {
  const { user } = useAuthContext();
  const userDetails = [
    user.displayName,
    user.email,
    user.uid,
    user.createdAt,
    user.lastLoginAt,
    user.appName,
  ];
  return <pre>{JSON.stringify(user, null, 2)}</pre>;
};

export default MyAccount;
