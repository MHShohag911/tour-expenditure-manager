"use client";

import Image from "next/image";
import Link from "next/link";

export function NavBar() {
  return (
    <nav className="mx-auto w-full p-2 rounded-xl bg-[#111827] border border-gray-800 lg:pl-6">
      <div className="relative mx-auto flex items-center justify-between">
        <Link
          href="/"
          aria-label="Tour Expenditure Manager home"
          className="mr-4 ml-2  flex cursor-pointer items-center py-1.5 font-medium"
        >
          <Image
            src="https://i.ibb.co/B1qwG90/logo.png"
            alt="TEM logo"
            width={48}
            height={48}
            className="rounded-full object-cover border border-white mr-2" 
          />

          <span className="text-xl font-bold text-white tracking-wider">
  TEM
</span>
        </Link>
      </div>
    </nav>
  );
}
