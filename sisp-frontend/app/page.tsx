'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpenText,
  Bot,
  Check,
  GraduationCap,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { PublicNavbar } from '@/components/shared/PublicNavbar';
import { PublicFooter } from '@/components/shared/PublicFooter';
import { HeroZoom, PosterReveal, Reveal } from '@/components/landing/LandingMotion';

type AdvisorMessage = {
  role: 'advisor' | 'student';
  text: string;
};

const promptOptions = [
  'What documents can I request?',
  'How can ARIA help with my curriculum?',
  'When should I talk to an adviser?',
];

const whyRmc = [
  {
    title: 'Quality education',
    body: 'Learn with skilled and experienced instructors who connect classroom work to practical outcomes.',
    icon: GraduationCap,
  },
  {
    title: 'Student-centered support',
    body: 'Get guidance from a community that values progress, belonging, and the confidence to finish strong.',
    icon: Users,
  },
  {
    title: 'Career-ready programs',
    body: 'Build useful skills through programs designed for today\'s workplaces and professional pathways.',
    icon: BookOpenText,
  },
  {
    title: 'Responsible digital services',
    body: 'Access academic services and an AI advisory assistant with clear pathways to human support.',
    icon: ShieldCheck,
  },
];

const programGroups = [
  {
    eyebrow: 'Technology',
    title: 'Computing',
    programs: ['BS Computer Science', 'Associate in Computer Technology'],
  },
  {
    eyebrow: 'Enterprise',
    title: 'Business and Office',
    programs: ['BS Office Administration', 'Diploma in Office Administration'],
  },
  {
    eyebrow: 'Formation',
    title: 'Education',
    programs: [
      'Bachelor of Elementary Education',
      'Bachelor of Secondary Education',
      'Certificate of Teaching Proficiency',
    ],
  },
  {
    eyebrow: 'Practice',
    title: 'Public Safety and Creative',
    programs: ['BS Criminology', 'BS Multimedia Arts'],
  },
];

function getPreviewResponse(question: string) {
  const text = question.toLowerCase();

  if (text.includes('document') || text.includes('transcript') || text.includes('record')) {
    return 'ARIA can explain the document-request process and direct signed-in students to the correct portal service. Official processing still stays with the school office.';
  }

  if (
    text.includes('curriculum') ||
    text.includes('subject') ||
    text.includes('course') ||
    text.includes('prerequisite')
  ) {
    return 'ARIA can help signed-in students understand curriculum progress, subject requirements, and prerequisite questions using approved school information.';
  }

  if (text.includes('adviser') || text.includes('human') || text.includes('exception')) {
    return 'ARIA refers exceptional, sensitive, or approval-based concerns to an academic adviser or the appropriate school office. It supports the work of human advisers.';
  }

  if (text.includes('enroll') || text.includes('admission')) {
    return 'ARIA can explain general enrollment steps and common requirements. Final eligibility, schedules, and approvals are confirmed by authorized RMC personnel.';
  }

  return 'In the full portal, ARIA answers questions about enrollment, curriculum progress, grades, schedules, and document requests using approved institutional sources.';
}

function AdvisorPreview() {
  const [messages, setMessages] = useState<AdvisorMessage[]>([
    {
      role: 'advisor',
      text: 'Hi, I am ARIA. Ask how I can support your academic journey at RMC.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const answeredPrompts = useMemo(
    () => new Set(messages.filter((message) => message.role === 'student').map((message) => message.text)),
    [messages],
  );

  const ask = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || isReplying) return;

    setMessages((current) => [...current, { role: 'student', text: trimmed }]);
    setInput('');
    setIsReplying(true);

    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        { role: 'advisor', text: getPreviewResponse(trimmed) },
      ]);
      setIsReplying(false);
    }, 550);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    ask(input);
  };

  return (
    <div className="public-panel overflow-hidden rounded-[1.75rem]">
      <div className="flex items-center justify-between border-b border-[#1a4a6e]/10 bg-[#f3f8fc] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#1a4a6e] text-white">
            <Bot className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-[#102f49]">ARIA Academic Advisor</p>
            <p className="text-xs text-[#49697f]">Interactive preview</p>
          </div>
        </div>
        <span className="rounded-full border border-[#1a4a6e]/20 bg-white px-3 py-1 text-xs font-semibold text-[#1a4a6e]">
          Preview mode
        </span>
      </div>

      <div aria-live="polite" className="h-[290px] space-y-3 overflow-y-auto bg-[#fbfdff] p-5">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === 'student' ? 'justify-end' : 'justify-start'}`}
          >
            <p
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                message.role === 'student'
                  ? 'rounded-br-sm bg-[#1a4a6e] text-white'
                  : 'rounded-bl-sm border border-[#1a4a6e]/10 bg-white text-[#294d65]'
              }`}
            >
              {message.text}
            </p>
          </div>
        ))}
        {isReplying && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-[#1a4a6e]/10 bg-white px-4 py-3 text-sm text-[#49697f]">
              ARIA is preparing a response...
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[#1a4a6e]/10 bg-white p-4">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {promptOptions.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isReplying}
              onClick={() => ask(prompt)}
              className="shrink-0 rounded-full border border-[#1a4a6e]/20 bg-[#f3f8fc] px-3 py-2 text-xs font-medium text-[#1a4a6e] transition hover:-translate-y-0.5 hover:border-[#1a4a6e]/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {answeredPrompts.has(prompt) && <Check className="mr-1 inline size-3" aria-hidden="true" />}
              {prompt}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <label htmlFor="aria-preview-question" className="sr-only">
            Ask ARIA a question
          </label>
          <input
            id="aria-preview-question"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={isReplying}
            placeholder="Ask about RMC academic services"
            className="min-w-0 flex-1 rounded-xl border border-[#1a4a6e]/20 bg-white px-4 py-3 text-sm text-[#102f49] outline-none transition placeholder:text-[#6c8799] focus:border-[#1a4a6e] focus:ring-2 focus:ring-[#1a4a6e]/20 disabled:bg-slate-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isReplying}
            aria-label="Send question"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#1a4a6e] text-white transition hover:bg-[#123a58] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Send className="size-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="public-site public-landing min-h-[100dvh] overflow-x-hidden bg-white text-[#102f49]">
      <PublicNavbar />

      <main>
        <section className="public-hero">
          <div className="public-hero-copy">
            <p className="public-eyebrow">Regis Marie College</p>
            <h1>Your next chapter.<br /><span>Starts at RMC.</span></h1>
            <p className="public-hero-description">Explore our programs, find academic guidance, and keep your student services in one place.</p>
            <div className="public-hero-actions">
              <Link href="/login" className="public-primary">Open student portal <ArrowRight className="size-4" /></Link>
              <a href="#programs" className="public-secondary">Explore programs <ArrowRight className="size-4" /></a>
            </div>
          </div>
          <div className="public-hero-photo">
            <HeroZoom>
              <Image src="/rmc/commencement.jpg" alt="Regis Marie College graduates at their commencement ceremony" fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover object-center" />
            </HeroZoom>
          </div>
        </section>

        <section id="aria" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto grid max-w-[1440px] items-center gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:gap-20">
            <Reveal>
              <p className="text-sm font-semibold text-[#1a4a6e]">Academic guidance, made clearer</p>
              <h2 className="mt-4 max-w-xl font-display text-4xl font-semibold leading-tight tracking-[-0.025em] text-[#102f49] sm:text-5xl">
                Ask ARIA before your next step.
              </h2>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-[#49697f]">
                ARIA helps students understand approved academic information, find the right service, and know when a human adviser should step in.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  'Enrollment, schedules, grades, and document-request guidance',
                  'Curriculum progress and prerequisite explanations',
                  'Clear referral for exceptions and approval-based concerns',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#dcecf7] text-[#1a4a6e]">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                    <p className="text-sm leading-relaxed text-[#294d65]">{item}</p>
                  </div>
                ))}
              </div>
              <Link href="/login" className="mt-9 inline-flex items-center gap-2 font-semibold text-[#1a4a6e] hover:underline">
                Sign in for personalized guidance
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Reveal>

            <Reveal delay={0.12}>
              <AdvisorPreview />
            </Reveal>
          </div>
        </section>

        <section id="why-rmc" className="scroll-mt-20 bg-[#f7f9fc] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-[1440px]">
            <Reveal className="max-w-3xl">
              <h2 className="font-display text-4xl font-semibold tracking-[-0.025em] text-[#102f49] sm:text-5xl">
                Why choose Regis Marie College?
              </h2>
              <p className="mt-5 max-w-2xl leading-relaxed text-[#49697f]">
                Quality programs, practical training, and a community that helps students finish strong.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <PosterReveal className="poster-frame self-start overflow-hidden rounded-[1.75rem] p-2 sm:p-3">
                <Image
                  src="/rmc/why-rmc.png"
                  alt="RMC reasons to choose the college"
                  width={1920}
                  height={1080}
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="h-auto w-full rounded-[1.25rem] object-contain"
                />
              </PosterReveal>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {whyRmc.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <Reveal key={item.title} delay={index * 0.06}>
                      <article className="public-panel rounded-2xl p-5 sm:p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#1a4a6e]">
                            <Icon className="size-5" aria-hidden="true" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-[#102f49]">{item.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-[#587387]">{item.body}</p>
                          </div>
                        </div>
                      </article>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="programs" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-[1440px]">
            <Reveal className="max-w-3xl">
              <p className="text-sm font-semibold text-[#1a4a6e]">Find your path</p>
              <h2 className="mt-4 font-display text-4xl font-semibold tracking-[-0.025em] text-[#102f49] sm:text-5xl">
                Programs built for your future.
              </h2>
              <p className="mt-5 max-w-2xl leading-relaxed text-[#49697f]">
                Explore computing, education, business, criminology, and creative media pathways at RMC.
              </p>
            </Reveal>

            <div className="mt-12 grid items-start gap-8 lg:grid-cols-[1.08fr_0.92fr]">
              <PosterReveal className="poster-frame overflow-hidden rounded-[1.75rem] p-2 sm:p-3">
                <Image
                  src="/rmc/offered-programs.png"
                  alt="Regis Marie College offered programs"
                  width={1920}
                  height={1080}
                  sizes="(min-width: 1024px) 54vw, 100vw"
                  className="h-auto w-full rounded-[1.25rem] object-contain"
                />
              </PosterReveal>
              <div className="grid content-start gap-4 sm:grid-cols-2">
                {programGroups.map((group, index) => (
                  <Reveal key={group.title} delay={index * 0.07}>
                    <article className="public-panel h-full rounded-2xl p-5 sm:p-6">
                      <p className="text-[11px] font-bold tracking-[0.16em] text-[#6a879a] uppercase">
                        {group.eyebrow}
                      </p>
                      <h3 className="mt-2 font-display text-2xl font-semibold text-[#102f49]">
                        {group.title}
                      </h3>
                      <ul className="mt-4 space-y-3">
                        {group.programs.map((program) => (
                          <li key={program} className="flex gap-3 text-sm leading-relaxed text-[#49697f]">
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#cf3340]" />
                            {program}
                          </li>
                        ))}
                      </ul>
                    </article>
                  </Reveal>
                ))}
                <a
                  href="mailto:itsupport@regismarie-college.com"
                  className="group flex min-h-20 items-center justify-between rounded-2xl bg-[#1a4a6e] px-5 py-4 font-semibold text-white shadow-[0_18px_40px_rgba(26,74,110,0.18)] transition hover:-translate-y-1 hover:bg-[#123a58] sm:col-span-2"
                >
                  Ask RMC about admissions
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="senior-high" className="bg-[#f7f9fc] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto grid max-w-[1440px] items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
            <PosterReveal className="poster-frame overflow-hidden rounded-[1.75rem] p-2 sm:p-3">
              <Image
                src="/rmc/senior-high.png"
                alt="Regis Marie College Senior High School programs"
                width={1920}
                height={1080}
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="h-auto w-full rounded-[1.25rem] object-contain"
              />
            </PosterReveal>
            <Reveal>
              <h2 className="font-display text-4xl font-semibold leading-tight tracking-[-0.025em] text-[#102f49] sm:text-5xl">
                Start strong in Senior High.
              </h2>
              <p className="mt-5 leading-relaxed text-[#49697f]">
                Build a focused foundation through RMC Senior High School pathways.
              </p>
              <div className="mt-8 space-y-4">
                <div className="public-panel rounded-2xl p-6 transition-transform hover:-translate-y-1">
                  <h3 className="text-xl font-semibold text-[#102f49]">ABM</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#587387]">Accountancy, Business, and Management</p>
                </div>
                <div className="public-panel rounded-2xl p-6 transition-transform hover:-translate-y-1">
                  <h3 className="text-xl font-semibold text-[#102f49]">HUMSS</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#587387]">Humanities and Social Sciences</p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="about" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-[1440px]">
            <Reveal className="grid gap-10 border-b border-[#1a4a6e]/20 pb-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
              <div>
                <Image src="/rmc/rmc-logo.png" alt="Regis Marie College seal" width={170} height={170} className="size-28 object-contain sm:size-36" />
                <h2 className="mt-7 font-display text-4xl font-semibold leading-tight tracking-[-0.025em] text-[#102f49] sm:text-5xl">
                  Conscience, competence, and compassion.
                </h2>
              </div>
              <div className="grid gap-8 sm:grid-cols-2">
                <article>
                  <h3 className="text-lg font-semibold text-[#102f49]">Mission</h3>
                  <p className="mt-4 text-sm leading-7 text-[#587387]">
                    RMC provides high-quality educational opportunities and support in a safe, accessible environment that builds critical thinking, communication, creativity, and cultural understanding.
                  </p>
                </article>
                <article>
                  <h3 className="text-lg font-semibold text-[#102f49]">Vision</h3>
                  <p className="mt-4 text-sm leading-7 text-[#587387]">
                    RMC creates educational experiences that respond to student needs and prepare graduates to help shape the future.
                  </p>
                </article>
              </div>
            </Reveal>

            <Reveal className="public-closing mt-12 flex flex-col items-start justify-between gap-6 rounded-[1.75rem] px-6 py-8 text-[#f7fbfd] sm:px-8 lg:flex-row lg:items-center lg:px-10">
              <div>
                <h2 className="font-display text-3xl font-semibold">Ready to continue your RMC journey?</h2>
                <p className="mt-2 text-sm text-[#d5e8f2]">Open the student portal or contact the school for admissions assistance.</p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 font-semibold text-[#1a4a6e] hover:bg-[#eef6fc]">
                  Open portal
                </Link>
                <a href="tel:09104947097" className="inline-flex h-11 items-center justify-center rounded-full border border-[#b8d6e8] px-6 font-semibold text-[#f7fbfd] hover:bg-white/10">
                  Call admissions
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
