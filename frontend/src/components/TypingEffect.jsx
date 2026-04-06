import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function TypingEffect({ 
  text, 
  speed = 40, 
  onComplete, 
  isPaused = false,
  className = "" 
}) {
  const [displayedText, setDisplatedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    // Reset if text changes
    setDisplatedText('');
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (currentIndex < text.length && !isPaused) {
      timerRef.current = setTimeout(() => {
        setDisplatedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 1000 / speed);
    } else if (currentIndex >= text.length && onComplete) {
      onComplete();
    }

    return () => clearTimeout(timerRef.current);
  }, [currentIndex, text, speed, isPaused, onComplete]);

  // Handle instant fallback if JS is disabled (though this is a React component)
  // We can provide a "skip" or instant finish mechanism by setting currentIndex to text.length

  return (
    <div className={`relative ${className}`} aria-live="polite">
      <span className="whitespace-pre-wrap">{displayedText}</span>
      {currentIndex < text.length && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="inline-block w-1.5 h-4 bg-accent ml-0.5 align-middle"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
