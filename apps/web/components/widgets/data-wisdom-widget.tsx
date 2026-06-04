"use client";

/**
 * Professional Motivation Widget
 * 
 * Displays motivational quotes from Quotable API focused on workplace excellence, 
 * discipline, hard work, and performance improvement. Features API integration
 * with local fallbacks, random quote selection, category tagging, and manual refresh.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Quote, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    text: "Innovation distinguishes between a leader and a follower.",
    author: "Steve Jobs",
    category: "Innovation"
  }
];

export function DataWisdomWidget() {
  const [currentQuote, setCurrentQuote] = useState<MotivationalQuote>(quotes[0]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load a random professional quote from API or local fallback
  useEffect(() => {
    const fetchRandomQuote = async () => {
      try {
        const response = await fetch(
          'https://api.quotable.io/random?tags=motivational,inspirational,success,wisdom,leadership&maxLength=200'
        );
        
        if (response.ok) {
          const apiQuote = await response.json();
          const formattedQuote: MotivationalQuote = {
            text: apiQuote.content,
            author: apiQuote.author,
            category: apiQuote.tags[0]?.charAt(0).toUpperCase() + apiQuote.tags[0]?.slice(1) || 'Motivation'
          };
          setCurrentQuote(formattedQuote);
        } else {
          throw new Error('API unavailable');
        }
      } catch (error) {
        console.log('Using fallback quote:', error);
        // Fallback to local quotes
        const randomIndex = Math.floor(Math.random() * quotes.length);
        setCurrentQuote(quotes[randomIndex]);
      }
    };

    fetchRandomQuote();
  }, []);

  const getRandomQuote = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(
        'https://api.quotable.io/random?tags=motivational,inspirational,success,wisdom,leadership&maxLength=200'
      );
      
      if (response.ok) {
        const apiQuote = await response.json();
        const formattedQuote: MotivationalQuote = {
          text: apiQuote.content,
          author: apiQuote.author,
          category: apiQuote.tags[0]?.charAt(0).toUpperCase() + apiQuote.tags[0]?.slice(1) || 'Motivation'
        };
        setCurrentQuote(formattedQuote);
      } else {
        throw new Error('API unavailable');
      }
    } catch (error) {
      console.log('Using fallback quote:', error);
      // Fallback to local quotes
      const randomIndex = Math.floor(Math.random() * quotes.length);
      setCurrentQuote(quotes[randomIndex]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Excellence': 'bg-blue-100 text-blue-800 border-blue-200',
      'Quality': 'bg-green-100 text-green-800 border-green-200', 
      'Consistency': 'bg-purple-100 text-purple-800 border-purple-200',
      'Discipline': 'bg-orange-100 text-orange-800 border-orange-200',
      'Action': 'bg-teal-100 text-teal-800 border-teal-200',
      'Improvement': 'bg-red-100 text-red-800 border-red-200',
      'Hard Work': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Commitment': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Perseverance': 'bg-amber-100 text-amber-800 border-amber-200',
      'Productivity': 'bg-rose-100 text-rose-800 border-rose-200',
      'Decision Making': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'Management': 'bg-slate-100 text-slate-800 border-slate-200',
      'Performance': 'bg-violet-100 text-violet-800 border-violet-200',
      'Attention': 'bg-lime-100 text-lime-800 border-lime-200',
      'Innovation': 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <Card className="widget-card h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Quote className="w-4 h-4 text-white" />
            </div>
            Professional Motivation
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={getRandomQuote}
            disabled={isRefreshing}
            className="h-8 w-8 p-0 hover:bg-muted"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Statistics Quote Text */}
          <div className="relative">
            <div className="absolute -top-2 -left-1 text-4xl text-muted-foreground/30 font-serif leading-none">
              "
            </div>
            <blockquote className="text-sm leading-relaxed text-foreground pl-6 pr-2 italic">
              {currentQuote.text}
            </blockquote>
            <div className="absolute -bottom-2 right-0 text-4xl text-muted-foreground/30 font-serif leading-none rotate-180">
              "
            </div>
          </div>

          {/* Author and Category */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="text-sm font-medium text-muted-foreground">
              — {currentQuote.author}
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(currentQuote.category)}`}>
              {currentQuote.category}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}