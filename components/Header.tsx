
import React from 'react';
import { SparklesIcon } from './icons';

const Header: React.FC = () => {
  return (
    <header className="text-center p-6">
      <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 text-transparent bg-clip-text inline-flex items-center gap-3">
        <SparklesIcon className="w-8 h-8 md:w-10 md:h-10" />
        AI Quick Notes
      </h1>
      <p className="text-slate-400 mt-2 text-lg">Your instant text summarizer and simplifier.</p>
    </header>
  );
};

export default Header;
