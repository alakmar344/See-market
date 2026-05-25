'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

export function AIResponse({ content, confidence }: { content: string; confidence: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel space-y-3 p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">AI Reasoning</h3>
        <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300">Confidence {Math.round(confidence * 100)}%</span>
      </div>
      <div className="prose prose-invert max-w-none text-sm">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </motion.section>
  );
}
