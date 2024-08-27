import Link from "next/link";
import Image from "next/image";
import dayjs from "dayjs";

const Navbar = () => {
  return (
    <header className="flex h-[70px] items-center border-b border-[#E3E3E3] flex-col justify-between w-full text-secondary">
      <div className="bg-[#4479FF] w-full text-center bg-opacity-[0.37]">
        🌎 join our next webinar on getting started with open source.{" "}
        <Link href={"#"} className="text-[#0267FF] underline">
          Click here  
        </Link>
      </div>
      <div className="flex items-center w-full px-6 pb-2 gap-5 "> 
        <Image src={"/images/msg.svg"} alt="logo" width={20} height={20} />
        <p>{dayjs().format("MMMM DD, YYYY")} Untitled</p> 
      </div>
    </header>
  );
};

export default Navbar;
