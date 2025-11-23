"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { Sun, Moon } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import LoginModal from "@/components/LoginModal";
import SignupModal from "@/components/SignUpModal";
import { useSearchParams } from "next/navigation";

const HomePageContent = () => {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [theme, setTheme] = useState(() =>
    typeof window !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "light"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      console.log("Supabase getUser result:", data, error);
      setUser(data?.user ?? null);
    };
    checkUser();
  }, []);

  useEffect(() => {
    if (searchParams.get("login") === "true") {
      setIsLoginOpen(true);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navigation */}
      <nav className="bg-surface/95 backdrop-blur-sm border-b border-border relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h2 className="text-2xl font-bold text-text-primary">FlowAI</h2>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <Link
                  href="/boards"
                  className="px-5 py-2.5 bg-surface hover:bg-muted border border-border hover:border-primary text-text-primary font-semibold rounded-xl transition-all"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <button
                    onClick={() => setIsLoginOpen(true)}
                    className="px-4 py-2 text-text-secondary hover:text-text-primary font-medium transition-colors"
                  >
                    Log in
                  </button>
                  <button
                    onClick={() => setIsSignupOpen(true)}
                    className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-md transition-all duration-300 shadow-lg"
                  >
                    Get started
                  </button>
                </>
              )}
              {/* Theme Toggle Button - now next to Log in and Get started */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-muted rounded-lg transition-all border border-transparent hover:border-border"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 px-4 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto">
          {/* Hero Content */}
          <div className="text-center max-w-4xl mx-auto mb-20">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-text-primary mb-8 leading-[1.1]">
              Think together.
              <br />
              Build faster.
            </h1>

            <p className="text-xl sm:text-2xl text-text-secondary mb-10 max-w-3xl mx-auto leading-relaxed font-light">
              An infinite canvas where your team's best work happens. Drop
              ideas, connect dots, let AI amplify your thinking.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8">
              <button
                onClick={() => setIsSignupOpen(true)}
                className="cursor-pointer px-8 py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-all duration-300 shadow-lg text-lg"
              >
                Start collaborating free
              </button>
            </div>

            <p className="text-sm text-text-secondary">
              No credit card • No setup time • Invite your team in seconds
            </p>
          </div>

          {/* Interactive Demo Preview */}
          <div className="max-w-6xl mx-auto mb-32">
            <div className="bg-surface rounded-2xl shadow-2xl overflow-hidden border border-border">
              <div className="relative bg-linear-to-br from-primary via-accent-purple to-accent-green p-12 min-h-[500px]">
                {/* Asymmetric grid layout for more dynamic feel */}
                <div className="grid grid-cols-12 gap-4 h-full">
                  {/* Large feature card */}
                  <div className="col-span-12 md:col-span-7 bg-background rounded-xl p-8 shadow-xl border border-border flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-green"></div>
                        <span className="text-xs font-semibold text-text-primary uppercase tracking-wide">
                          Live collaboration
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-text-primary mb-3">
                        Real-time visual thinking
                      </h3>
                      <p className="text-text-secondary mb-6">
                        Create sticky notes, draw connections, and see your
                        team's ideas come to life instantly. Every cursor
                        movement, every edit, every moment happens in perfect
                        sync.
                      </p>
                      <p className="text-text-secondary mb-6">
                        Your AI teammate can create notes, identify patterns in
                        your notes, summarize your board, and turn brainstorms
                        into action plans. Just ask!
                      </p>
                    </div>
                  </div>

                  {/* AI card */}
                  <div className="col-span-12 md:col-span-5 bg-background rounded-xl p-6 shadow-xl border border-border">
                    <div className="mb-4">
                      <span className="text-xs bg-primary text-white px-3 py-1 rounded-full font-semibold">
                        AI ASSISTANT
                      </span>
                    </div>
                    <div className="space-y-3 mb-4">
                      <div className="bg-surface rounded-lg p-3 border-l-4 border-accent-orange">
                        <p className="text-sm font-medium text-text-primary">
                          "Create 10 ideas for my project and place them on
                          notes"
                        </p>
                      </div>
                      <div className="bg-surface rounded-lg p-3 border-l-4 border-accent-purple">
                        <p className="text-sm font-medium text-text-primary">
                          "Summarize this board"
                        </p>
                      </div>
                      <div className="bg-surface rounded-lg p-3 border-l-4 border-accent-green">
                        <p className="text-sm font-medium text-text-primary">
                          "Generate next action items from our discussion"
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary">
                      AI understands your board context and helps you
                      brainstorm, organize, and move forward faster.
                    </p>
                  </div>

                  {/* Quick action cards */}
                  <div className="col-span-6 md:col-span-4 bg-background rounded-xl p-5 shadow-xl border border-border">
                    <div className="mb-3">
                      <span className="text-xs bg-primary text-white px-2 py-1 rounded font-semibold">
                        NOTES
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary">
                      Sticky notes that actually stick. No more lost ideas.
                    </p>
                  </div>

                  <div className="col-span-6 md:col-span-4 bg-background rounded-xl p-5 shadow-xl border border-border">
                    <div className="mb-3">
                      <span className="text-xs bg-primary text-white px-2 py-1 rounded font-semibold">
                        LINKS
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary">
                      Draw connections between ideas. Make sense of chaos.
                    </p>
                  </div>

                  <div className="col-span-12 md:col-span-4 bg-background rounded-xl p-5 shadow-xl border border-border">
                    <div className="mb-3">
                      <span className="text-xs bg-primary text-white px-2 py-1 rounded font-semibold">
                        INFINITE CANVAS
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary">
                      Zoom out to see the big picture. Zoom in for details.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* How it works - Step by step */}
          <div className="max-w-6xl mx-auto mb-32">
            <div className="text-center mb-20">
              <h2 className="text-4xl sm:text-6xl font-bold text-text-primary mb-6">
                From blank canvas to breakthrough
              </h2>
              <p className="text-xl text-text-secondary">
                Three steps to better collaboration
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
              {/* Step 1 */}
              <div className="relative group">
                <div className="p-8 transition-all duration-300">
                  <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center text-xl font-bold mb-6 transition-transform group-hover:scale-110">
                    1
                  </div>
                  <h3 className="text-xl font-bold text-text-primary mb-4">
                    Drop your ideas on the canvas
                  </h3>
                  <p className="text-text-secondary leading-relaxed">
                    Create notes, upload images, paste links. Everything lives
                    on an infinite board. No folders, no hierarchy—just spatial
                    freedom.
                  </p>
                  <div className="mt-6 w-16 h-1 bg-primary rounded-full opacity-50"></div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative group">
                <div className="p-8 transition-all duration-300">
                  <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center text-xl font-bold mb-6 transition-transform group-hover:scale-110">
                    2
                  </div>
                  <h3 className="text-xl font-bold text-text-primary mb-4">
                    Invite your team, collaborate live
                  </h3>
                  <p className="text-text-secondary leading-relaxed">
                    Share a link. Everyone sees the same board. Cursors, edits,
                    and updates appear instantly. It's chaos that makes sense.
                  </p>
                  <div className="mt-6 w-16 h-1 bg-primary rounded-full opacity-50"></div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative group">
                <div className="p-8 transition-all duration-300">
                  <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center text-xl font-bold mb-6 transition-transform group-hover:scale-110">
                    3
                  </div>
                  <h3 className="text-xl font-bold text-text-primary mb-4">
                    Let AI do the heavy lifting
                  </h3>
                  <p className="text-text-secondary leading-relaxed">
                    Ask AI to organize, summarize, or generate next steps. It
                    reads your board, understands context, and helps you move
                    faster.
                  </p>
                  <div className="mt-6 w-16 h-1 bg-primary rounded-full opacity-50"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Use cases - Concrete examples */}
          <div className="max-w-6xl mx-auto mb-32">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4">
                Built for how you actually work
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface border border-border rounded-2xl p-8 hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold text-text-primary mb-3">
                  Design teams
                </h3>
                <p className="text-text-secondary mb-4">
                  Mood boards, user flows, wireframe feedback—all in one place.
                  No more scattered Figma links and Slack threads.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-muted border border-border text-text-primary px-3 py-1 rounded-full font-medium">
                    Brainstorming
                  </span>
                  <span className="text-xs bg-muted border border-border text-text-primary px-3 py-1 rounded-full font-medium">
                    Mood boards
                  </span>
                  <span className="text-xs bg-muted border border-border text-text-primary px-3 py-1 rounded-full font-medium">
                    Design reviews
                  </span>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-2xl p-8 hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold text-text-primary mb-3">
                  Product managers
                </h3>
                <p className="text-text-secondary mb-4">
                  Roadmaps, sprint planning, feature specs. Keep engineering,
                  design, and stakeholders on the same page—literally.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-muted border border-border text-text-primary px-3 py-1 rounded-full font-medium">
                    Sprint planning
                  </span>
                  <span className="text-xs bg-muted border border-border text-text-primary px-3 py-1 rounded-full font-medium">
                    Roadmaps
                  </span>
                  <span className="text-xs bg-muted border border-border text-text-primary px-3 py-1 rounded-full font-medium">
                    User stories
                  </span>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-2xl p-8 hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold text-text-primary mb-3">
                  Startup founders
                </h3>
                <p className="text-text-secondary mb-4">
                  Strategy sessions, investor pitch prep, product evolution.
                  Watch your startup's story unfold on one infinite canvas.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-muted border border-border text-text-primary px-3 py-1 rounded-full font-medium">
                    Strategy
                  </span>
                  <span className="text-xs bg-muted border border-border text-text-primary px-3 py-1 rounded-full font-medium">
                    Pitch decks
                  </span>
                  <span className="text-xs bg-muted border border-border text-text-primary px-3 py-1 rounded-full font-medium">
                    GTM planning
                  </span>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-2xl p-8 hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold text-text-primary mb-3">
                  Remote teams
                </h3>
                <p className="text-text-secondary mb-4">
                  Async brainstorms, team retrospectives, project kickoffs. Time
                  zones don't matter when the board never sleeps.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-muted border border-border text-text-primary px-3 py-1 rounded-full font-medium">
                    Async work
                  </span>
                  <span className="text-xs bg-muted border border-border text-text-primary px-3 py-1 rounded-full font-medium">
                    Retrospectives
                  </span>
                  <span className="text-xs bg-muted border border-border text-text-primary px-3 py-1 rounded-full font-medium">
                    Stand-ups
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="max-w-4xl mx-auto text-center p-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-text-primary mb-6">
              Stop talking about ideas.
              <br />
              Start building them.
            </h2>
            <p className="text-xl text-text-secondary mb-8">
              Join teams who've ditched endless meetings for visual
              collaboration that actually works.
            </p>
            <button
              onClick={() => setIsSignupOpen(true)}
              className="cursor-pointer px-10 py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-all duration-300 shadow-lg text-lg"
            >
              Create your first board—free
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center">
          <p className="text-sm text-text-secondary">© 2025 FlowAI</p>
        </div>
      </footer>

      {/* Modals */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSwitchToSignup={() => setIsSignupOpen(true)}
      />
      <SignupModal
        isOpen={isSignupOpen}
        onClose={() => setIsSignupOpen(false)}
        onSwitchToLogin={() => setIsLoginOpen(true)}
      />
    </div>
  );
};

const HomePage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePageContent />
    </Suspense>
  );
};

export default HomePage;
