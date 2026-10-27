import Link from "next/link";
import { FaFacebookF, FaInstagram, FaGithub } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6"; // X is in fa6

const currentYear = new Date().getFullYear();

const socialLinks = [
  {
    name: "Facebook",
    href: "https://facebook.com/iam.mh.shohag",
    icon: <FaFacebookF />,
  },
  {
    name: "Instagram",
    href: "#",
    icon: <FaInstagram />,
  },
  {
    name: "X",
    href: "https://x.com/shohagmdhossain",
    icon: <FaXTwitter />,
  },
  {
    name: "Github",
    href: "https://github.com/mhshohag911",
    icon: <FaGithub />,
  },
];

export default function Footer() {
  return (
    <footer className="w-full rounded-lg bg-[#111827]">
      <div className="mx-auto my-2 w-full px-8">
        <div className="flex w-full flex-col-reverse items-center justify-center py-4 md:flex-row md:justify-between">
          <p className="text-center text-sm py-2 font-normal text-gray-300 md:mb-0">
            © {currentYear}{" "}
            <span>
              Designed &amp; Developed by{" "}
              <Link
                className="text-[#1DD100] transition font-bold hover:underline"
                href={"https://heartfelt-alfajores-6c383e.netlify.app/"}
              > <br className="md:hidden"/>
                M H Shohag
              </Link>
            </span>
            . All Rights Reserved.
          </p>

          <div className="flex gap-4 text-white sm:justify-center">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                aria-label={social.name}
                className="text-2xl text-gray-300 transition hover:text-[#1DD100]"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
