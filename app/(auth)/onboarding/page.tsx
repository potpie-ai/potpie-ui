"use client";
import getHeaders from "@/app/utils/headers.util";
import { Button } from "@/components/ui/button";
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import {
  arrowcon,
  chat,
  cloud,
  cross,
  logo60,
  logoWithText,
  sendBlue,
  setting,
} from "@/public";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useRef, useState } from "react";

const Onboarding = () => {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const name = searchParams.get('name');
  const [formData, setFormData] = useState({
    email: email || '',
    name: name || '',
    source: "",
    industry: "",
    jobTitle: "",
    companyName: ""
  });

  const uid = searchParams.get('uid');

  const router = useRouter();

  const submitOnboarding = async () => {
    try {
      const userDoc = {
        uid,
        ...formData,
        createdAt: new Date().toISOString()
      };

      const db = getFirestore();
      await setDoc(doc(db, "users", uid || ''), userDoc);
      
      router.push("/");
    } catch (error) {
      console.error("Error saving onboarding data:", error);
    }
  };

  return (
    <section className="flex items-center justify-between w-full h-screen relative">
      <div className="w-full bg-[#515983] h-full flex flex-col items-center justify-center gap-28">
        <div className="h-3/6 w-3/5 bg-white rounded-3xl relative">
          <div className="flex justify-between flex-col w-full h-full">
            <div className="mt-auto py-6 px-4 flex flex-col gap-5 h-full">
              <div className="flex items-start justify-start gap-2">
                <div className="w-10 h-10 bg-[#FFF1E0] rounded-full grid place-items-center text-primary">
                  AK
                </div>
                <div className="bg-[#FFF1E0] h-20 w-[70%] rounded-lg"></div>
              </div>
              <div className="flex items-start justify-end gap-2">
                <div className="bg-[#E0F3FF] h-20 w-[70%] rounded-lg"></div>
                <div className="w-10 h-10 bg-[#FFF1E0] rounded-full grid place-items-center text-primary">
                  <Image src={logo60} alt="logo60" className="rounded-full" />
                </div>
              </div>
              <div className="flex items-start justify-start gap-2">
                <div className="w-10 h-10 bg-[#FFF1E0] rounded-full grid place-items-center text-primary">
                  AK
                </div>
                <div className="bg-[#FFF1E0] h-10 w-[70%] rounded-lg"></div>
              </div>
            </div>
            <div className="mb-6 w-5/6 mx-auto h-10 flex justify-end border-2 rounded-sm border-[#3E99DB]">
              <Image src={sendBlue} alt="sendBlue" className="ml-auto mr-2" />
            </div>
          </div>
          <Image
            src={arrowcon}
            className="absolute -bottom-[6rem] right-0 "
            alt="arrowcon"
          />
          <Image src={cross} className="absolute top-0 -right-11" alt="cross" />
        </div>
        <div className="text-xl text-center text-white font-bold mb-10">
          Build AI agents specialised on your <br /> codebase in a minute
        </div>
      </div>
      <div className="w-full h-full flex items-center justify-center flex-col gap-14">
        <Image src={logoWithText} alt="logo" />
        <div className="flex items-center justify-center flex-col text-border">
          <h3 className="text-2xl font-bold text-black">Let's get a few more info and you are good to go!</h3>

          <form onSubmit={(e) => {
            e.preventDefault();
            submitOnboarding();
          }} className="flex items-start justify-start flex-col mt-10 gap-6">
             <div className="flex flex-col gap-2">
              <label className="text-sm font-medium font-black">Email</label>
              <input 
                type="email"
                value={email || ''}
                className="w-80 p-2 border rounded-md bg-gray-100" 
                disabled
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium font-black">Name</label>
              <input 
                type="text"
                placeholder="Enter your name"
                value={name || ''}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-80 p-2 border rounded-md"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium font-black">How did you find us?</label>
              <select 
                value={formData.source}
                onChange={(e) => setFormData({...formData, source: e.target.value})}
                className="w-80 p-2 border rounded-md" 
                required
              >
                <option value="">Select an option</option>
                <option value="Reddit">Reddit</option>
                <option value="Twitter">Twitter</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="HackerNews">HackerNews</option>
                <option value="HackerNews">Other</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium font-black">Industry you work in?</label>
              <input 
                type="text"
                placeholder="Enter your industry"
                value={formData.industry}
                onChange={(e) => setFormData({...formData, industry: e.target.value})}
                className="w-80 p-2 border rounded-md"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium font-black">Your job title?</label>
              <input
                type="text" 
                placeholder="Enter your job title"
                value={formData.jobTitle}
                onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                className="w-80 p-2 border rounded-md"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium font-black">Your company name?</label>
              <input
                type="text"
                placeholder="Enter your company name"
                value={formData.companyName} 
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                className="w-80 p-2 border rounded-md"
                required
              />
            </div>
          </form>
          <Button onClick={() => submitOnboarding()} className="mt-14 gap-2">
            Submit
          </Button>
        </div>
      </div>
      <Image src={chat} className="absolute top-0" alt="chat" />
      <Image src={cloud} className="absolute bottom-2" alt="cloud" />
      <Image src={setting} className="absolute top-0 right-0" alt="setting" />
    </section>
  );
};

export default Onboarding;
