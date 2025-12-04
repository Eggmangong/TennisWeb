"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function Home() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-gray-900 pb-16 pt-14 sm:pb-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=2500&auto=format&fit=crop"
          alt="Tennis Court"
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} />
        </div>
        
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
            <div className="hidden sm:mb-8 sm:flex sm:justify-center">
              <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-400 ring-1 ring-white/10 hover:ring-white/20">
                New AI Matching is live. <Link href="/match" className="font-semibold text-white"><span className="absolute inset-0" aria-hidden="true" />Try it out <span aria-hidden="true">&rarr;</span></Link>
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                Enjoy Tennis with RallyUp
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-300">
                Connect with local tennis enthusiasts, find your perfect hitting partner using AI, and track your progress. The court is calling.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link
                  href="/match"
                  className="rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                >
                  Find a Partner
                </Link>
                {isAuthenticated ? (
                  <Link href="/profile" className="text-sm font-semibold leading-6 text-white">
                    My Profile <span aria-hidden="true">→</span>
                  </Link>
                ) : (
                  <Link href="/login/register" className="text-sm font-semibold leading-6 text-white">
                    Join Now <span aria-hidden="true">→</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">Play Better</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to find your match
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Whether you are a beginner or a pro, RallyUp helps you find the right community.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            <div className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-600">
                   <span className="text-white text-xl">🎾</span>
                </div>
                Smart Matching
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">Use our advanced AI to find partners that match your skill level, location, and playing style.</p>
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-600">
                   <span className="text-white text-xl">💬</span>
                </div>
                Instant Chat
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">Connect instantly with potential partners. Schedule matches and discuss details seamlessly.</p>
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-600">
                   <span className="text-white text-xl">📈</span>
                </div>
                Track Progress
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">Keep track of your matches, check-ins, and improve your game over time.</p>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
