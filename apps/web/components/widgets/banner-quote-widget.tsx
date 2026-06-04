"use client";

/**
 * Banner Quote Widget
 * 
 * Displays daily motivational quotes from Quotable API focused on workplace 
 * excellence, discipline, hard work, and professional performance improvement.
 * Features API integration with local fallbacks and daily caching.
 * Shows one quote per day in a banner-friendly format.
 */

import { useState, useEffect } from "react";
import { Quote } from "lucide-react";
import { gradients } from "@/app/ui-standards";

interface MotivationalQuote {
  text: string;
  author: string;
  category: string;
}

const quotes: MotivationalQuote[] = [
  {
    text: "Excellence is never an accident. It is always the result of high intention, sincere effort, and intelligent execution.",
    author: "Aristotle",
    category: "Excellence"
  },
  {
    text: "Quality is never an accident; it is always the result of high intention, sincere effort, intelligent direction and skillful execution.",
    author: "William A. Foster",
    category: "Quality"
  },
  {
    text: "Success is the sum of small efforts repeated day in and day out.",
    author: "Robert Collier",
    category: "Consistency"
  },
  {
    text: "Discipline is the bridge between goals and accomplishment.",
    author: "Jim Rohn",
    category: "Discipline"
  },
  {
    text: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney",
    category: "Action"
  },
  {
    text: "Continuous improvement is better than delayed perfection.",
    author: "Mark Twain",
    category: "Improvement"
  },
  {
    text: "Hard work beats talent when talent doesn't work hard.",
    author: "Tim Notke",
    category: "Hard Work"
  },
  {
    text: "Commitment is what transforms a promise into reality.",
    author: "Abraham Lincoln",
    category: "Commitment"
  },
  {
    text: "The expert in anything was once a beginner who refused to give up.",
    author: "Helen Hayes",
    category: "Perseverance"
  },
  {
    text: "Focus on being productive instead of busy.",
    author: "Tim Ferriss",
    category: "Productivity"
  },
  {
    text: "Data-driven decisions lead to sustainable success.",
    author: "Business Wisdom",
    category: "Decision Making"
  },
  {
    text: "Measure what matters, manage what you measure.",
    author: "Peter Drucker",
    category: "Management"
  },
  {
    text: "Performance improvement comes from consistent daily habits.",
    author: "James Clear",
    category: "Performance"
  },
  {
    text: "Attention to detail is the foundation of professional excellence.",
    author: "Professional Wisdom",
    category: "Attention"
  },
  {
    text: "Teamwork divides the task and multiplies the success.",
    author: "Workplace Wisdom",
    category: "Teamwork"
  },
  {
    text: "Innovation distinguishes between a leader and a follower.",
    author: "Steve Jobs",
    category: "Innovation"
  },
  {
    text: "The best preparation for tomorrow is doing your best today.",
    author: "H. Jackson Brown Jr.",
    category: "Preparation"
  },
  {
    text: "Efficiency is doing things right; effectiveness is doing the right things.",
    author: "Peter Drucker",
    category: "Effectiveness"
  },
  {
    text: "Success is walking from failure to failure with no loss of enthusiasm.",
    author: "Winston Churchill",
    category: "Resilience"
  },
  {
    text: "The road to success and the road to failure are almost exactly the same.",
    author: "Colin R. Davis",
    category: "Success"
  },
  {
    text: "Professional growth comes from stepping outside your comfort zone.",
    author: "Career Wisdom",
    category: "Growth"
  },
  {
    text: "Accuracy and reliability build trust in every workplace.",
    author: "Professional Standards",
    category: "Trust"
  },
  {
    text: "Time management is life management.",
    author: "Robin Sharma",
    category: "Time Management"
  },
  {
    text: "Clear communication prevents confusion and builds efficiency.",
    author: "Business Principles",
    category: "Communication"
  },
  {
    text: "Accountability is the glue that ties commitment to results.",
    author: "Bob Proctor",
    category: "Accountability"
  },
  {
    text: "Professionalism is knowing how to do it, when to do it, and doing it.",
    author: "Frank Tyger",
    category: "Professionalism"
  },
  {
    text: "Learning never exhausts the mind; it fuels career advancement.",
    author: "Leonardo da Vinci",
    category: "Learning"
  },
  {
    text: "Integrity is doing the right thing when no one is watching.",
    author: "C.S. Lewis",
    category: "Integrity"
  },
  {
    text: "Planning prevents poor performance.",
    author: "Benjamin Franklin",
    category: "Planning"
  },
  {
    text: "Every master was once a beginner. Every pro was once an amateur.",
    author: "Robin Sharma",
    category: "Mastery"
  },
  {
    text: "Consistency in small actions leads to extraordinary results.",
    author: "Workplace Excellence",
    category: "Results"
  }
];

export function BannerQuoteWidget() {
  const [currentQuote, setCurrentQuote] = useState<MotivationalQuote>(quotes[0]);
  const [isLoading, setIsLoading] = useState(true);

  // Select today's quote from the internal list — deterministic, no external requests.
  useEffect(() => {
    const dayOfYear = Math.floor(
      (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    setCurrentQuote(quotes[dayOfYear % quotes.length]);
    setIsLoading(false);
  }, []);

  return (
    <div className="relative">
      {/* Ambient gold glow behind the widget */}
      <div 
        className="absolute -inset-3 opacity-25"
        style={{
          background: gradients.goldGlowEllipse,
          filter: "blur(20px)"
        }}
      />
      <div className="relative bg-white/10 backdrop-blur-sm rounded-md p-4 max-w-md border border-white/20">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <Quote className="w-4 h-4 text-white" />
          </div>
          <span className="text-white text-sm font-medium">Daily Inspiration</span>
        </div>

        {/* Quote Content */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-white/20 rounded w-full mb-2"></div>
              <div className="h-4 bg-white/20 rounded w-3/4 mb-3"></div>
              <div className="flex items-center justify-between">
                <div className="h-3 bg-white/20 rounded w-24"></div>
                <div className="h-5 bg-white/20 rounded-full w-16"></div>
              </div>
            </div>
          ) : (
            <>
              {/* Professional Quote Text */}
              <blockquote className="text-white/90 text-sm leading-relaxed italic">
                &ldquo;{currentQuote.text}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center justify-between">
                <div className="text-white/70 text-xs">
                  — {currentQuote.author}
                </div>
                <div className="px-2 py-1 bg-white/20 rounded-full text-xs text-white/80 font-medium">
                  {currentQuote.category}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}