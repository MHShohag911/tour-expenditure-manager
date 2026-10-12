"use client";

import Image from "next/image";
import Link from "next/link";

export function NavBar() {
  return (
    <nav className="mx-auto w-full my-5 p-2 rounded-xl border border-gray-200 lg:pl-6 shadow-xl">
      <div className="relative mx-auto flex items-center justify-between">
        <Link
          href="/"
          aria-label="Tour Expenditure Manager home"
          className="mr-4 ml-2 flex cursor-pointer items-center py-1.5 font-medium"
        >
          <Image
            src="https://i.ibb.co/B1qwG90/logo.png"
            alt="TEM logo"
            width={48}
            height={48}
            className="rounded-full object-cover"
          />

          <span className="ml-3 text-4xl font-bold text-[#090040]">
            TEM
          </span>
        </Link>
      </div>
    </nav>
  );
}
