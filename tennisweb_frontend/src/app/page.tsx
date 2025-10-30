import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative isolate">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:flex lg:items-center lg:gap-x-10 lg:px-8 lg:py-40">
        <div className="mx-auto max-w-2xl lg:mx-0 lg:flex-auto">
          <h1 className="max-w-lg text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            RallyUp
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Here to connect tennis enthusiasts, track your performance, and find
            your next match.
          </p>
          <div className="mt-10 flex items-center gap-x-6">
            <Link
              href="/matches"
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Find a Match
            </Link>
            <Link href="/rankings" className="text-sm font-semibold leading-6 text-gray-900">
              View Rankings <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <div className="mt-16 sm:mt-24 lg:mt-0 lg:flex-shrink-0 lg:flex-grow">
          {/* 这里可以添加网球相关的图片 */}
        </div>
      </div>
    </div>
  );
}
