import Image from 'next/image';
import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="border-t border-[#dce5ed] bg-[#f7f9fc] px-4 pb-8 pt-14 text-[#102f49] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <div className="grid gap-10 border-b border-[#dce5ed] pb-12 md:grid-cols-[1.1fr_0.9fr_0.9fr]">
          <div className="max-w-md">
            <div className="flex items-center gap-3">
              <Image src="/rmc/rmc-logo.png" alt="" width={52} height={52} className="size-12 rounded-full object-contain" />
              <div>
                <p className="font-semibold">Regis Marie College</p>
                <p className="mt-0.5 text-xs text-[#587387]">Home of Educators</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-[#49697f]">
              Accessible quality education shaped by character, competence, and compassion.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold">Visit campus</h2>
            <address className="mt-4 text-sm not-italic leading-6 text-[#49697f]">
              F. Llosa-Lane Village-Andres St.<br />
              Bagong Pook, Parañaque City
            </address>
            <p className="mt-3 text-xs text-[#587387]">Monday to Friday, 8:00 AM to 5:00 PM</p>
          </div>

          <div>
            <h2 className="text-sm font-semibold">Contact RMC</h2>
            <div className="mt-4 grid gap-3 text-sm text-[#49697f]">
              <a href="tel:09104947097" className="hover:text-[#102f49]">0910 494 7097</a>
              <a href="mailto:itsupport@regismarie-college.com" className="break-all hover:text-[#102f49]">itsupport@regismarie-college.com</a>
              <a href="https://www.facebook.com/regismariecollegeparanaque" target="_blank" rel="noreferrer" className="hover:text-[#102f49]">
                Facebook page
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-7 text-xs text-[#587387] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Regis Marie College. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/about" className="hover:text-[#102f49]">About SISP</Link>
            <Link href="/services" className="hover:text-[#102f49]">Services</Link>
            <Link href="/support" className="hover:text-[#102f49]">Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
