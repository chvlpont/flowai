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
                  className="px-5 py-2.5 bg-surface hover:bg-surface-muted border border-border hover:border-primary text-text-primary font-semibold rounded-xl transition-all"
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
                    className="px-5 py-2.5 bg-primary hover:from-primary-hover hover:to-accent-purple text-white font-medium rounded-md transition-all duration-300 shadow-lg"
                  >
                    Get started
                  </button>
                </>
              )}
              {/* Theme Toggle Button - now next to Log in and Get started */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-muted rounded-lg transition-all border border-transparent hover:border-border"
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
          <div className="text-center max-w-4xl mx-auto mb-16">
            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary mb-6 leading-tight">
              The next-gen AI collaboration board for creative teams
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-text-secondary mb-8 max-w-2xl mx-auto leading-relaxed">
              Collaborate visually, brainstorm ideas, and organize your workflow
              together. Drag notes, connect concepts, and let AI help automate
              and enhance your team's creativity—all in real time.
            </p>

            {/* CTA Button */}
            <div className="flex justify-center items-center mb-4">
              <button
                onClick={() => setIsSignupOpen(true)}
                className="px-8 py-3.5 bg-primary hover:from-primary-hover hover:to-accent-green text-white font-semibold rounded-md transition-all duration-300 shadow-lg text-base"
              >
                Sign up - it's free!
              </button>
            </div>
          </div>

          {/* Product Preview - Collaboration board */}
          <div className="max-w-5xl mx-auto">
            <div className="bg-surface rounded-lg shadow-2xl overflow-hidden border border-border">
              {/* Browser-like header */}
              <div className="bg-surface-muted border-b border-border px-4 py-3 flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-accent-green"></div>
                </div>
              </div>

              {/* Visual Collaboration Board Preview */}
              <div className="bg-linear-to-br from-primary via-accent-purple to-accent-green p-8 sm:p-12">
                <div className="flex flex-wrap gap-8 justify-center items-center">
                  {/* Sticky Notes */}
                  <div className="bg-background rounded-lg p-6 shadow-lg border border-border w-64 h-40 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-text-primary mb-2 text-base">
                        Team Brainstorm
                      </h3>
                      <p className="text-text-secondary text-sm">
                        Share ideas visually with sticky notes.
                      </p>
                    </div>
                    <span className="text-xs bg-primary text-white px-2 py-1 rounded self-end">
                      Note
                    </span>
                  </div>
                  {/* Connections */}
                  <div className="bg-background rounded-lg p-6 shadow-lg border border-border w-64 h-40 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-text-primary mb-2 text-base">
                        Connect Ideas
                      </h3>
                      <p className="text-text-secondary text-sm">
                        Draw lines to link concepts and tasks.
                      </p>
                    </div>
                    <span className="text-xs bg-accent-purple text-white px-2 py-1 rounded self-end">
                      Connection
                    </span>
                  </div>
                  {/* Real-time Collaboration */}
                  <div className="bg-background rounded-lg p-6 shadow-lg border border-border w-64 h-40 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-text-primary mb-2 text-base">
                        Live Collaboration
                      </h3>
                      <p className="text-text-secondary text-sm">
                        See changes instantly as teammates edit.
                      </p>
                    </div>
                    <span className="text-xs bg-accent-green text-white px-2 py-1 rounded self-end">
                      Live
                    </span>
                  </div>
                  {/* AI Assistant */}
                  <div className="bg-background rounded-lg p-6 shadow-lg border border-border w-64 h-40 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-text-primary mb-2 text-base">
                        AI Assistant
                      </h3>
                      <p className="text-text-secondary text-sm">
                        Let AI organize, suggest, and automate your board.
                      </p>
                    </div>
                    <span className="text-xs bg-accent-orange text-white px-2 py-1 rounded self-end">
                      AI
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-20">
            <div className="text-center">
              <div className="w-12 h-12 bg-linear-to-br from-primary/20 to-accent-purple/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <rect
                    x="7"
                    y="7"
                    width="10"
                    height="4"
                    rx="2"
                    fill="currentColor"
                    opacity="0.2"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary mb-2 text-lg">
                Visual Creativity
              </h3>
              <p className="text-text-secondary text-sm">
                Sketch, connect, and organize ideas visually. Drag notes, draw
                lines, and build your board your way.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-linear-to-br from-accent-purple/20 to-accent-purple/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-accent-purple"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 20v-6m0 0l-4-4m4 4l4-4"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary mb-2 text-lg">
                Real-time Collaboration
              </h3>
              <p className="text-text-secondary text-sm">
                Work together instantly. See teammates' changes live as you
                brainstorm and build.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-linear-to-br from-accent-green/20 to-accent-green/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-accent-green"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h8"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary mb-2 text-lg">
                AI-Powered Assistance
              </h3>
              <p className="text-text-secondary text-sm">
                Let AI organize, suggest, and automate your board. Get smart
                recommendations and instant help.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-border py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-text-secondary">
              © 2025 Kanb
              <span className="bg-linear-to-r from-primary via-accent-purple to-accent-green bg-clip-text text-transparent">
                ai
              </span>
              . All rights reserved.
            </div>
            <div className="flex gap-6">
              <Link
                href="/about"
                className="text-text-secondary hover:text-text-primary text-sm transition-colors"
              >
                About
              </Link>
              <Link
                href="/contact"
                className="text-text-secondary hover:text-text-primary text-sm transition-colors"
              >
                Contact
              </Link>
              <Link
                href="/privacy"
                className="text-text-secondary hover:text-text-primary text-sm transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-text-secondary hover:text-text-primary text-sm transition-colors"
              >
                Terms
              </Link>
            </div>
          </div>
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
