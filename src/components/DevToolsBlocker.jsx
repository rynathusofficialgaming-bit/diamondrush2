import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { APP_CONFIG } from '@/config/app-config';

const DevToolsBlocker = ({ children }) => {
  const [isBlocked, setIsBlocked] = useState(false);
  const { enabled, redirectUrl } = APP_CONFIG.security.devtoolsBlocker;

  useEffect(() => {
    if (!enabled) return;

    const checkDevTools = () => {
      // Heuristic 1: Window size difference
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;

      if (widthThreshold || heightThreshold) {
        setIsBlocked(true);
        return;
      }

      // Heuristic 2: debugger statement timing
      const start = new Date().getTime();
      debugger;
      const end = new Date().getTime();

      if (end - start > 100) {
        setIsBlocked(true);
      }
    };
    
    // Initial check
    checkDevTools();

    // Interval to check periodically
    const interval = setInterval(checkDevTools, 500);

    // Redirect logic
    if (isBlocked) {
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 3000);
    }
    
    // Cleanup
    return () => clearInterval(interval);

  }, [isBlocked, enabled, redirectUrl]);
  
  // Right-click blocker
  useEffect(() => {
    if (!enabled) return;
    const preventContextMenu = (e) => e.preventDefault();
    document.addEventListener('contextmenu', preventContextMenu);
    return () => document.removeEventListener('contextmenu', preventContextMenu);
  }, [enabled]);

  return (
    <>
      <AnimatePresence>
        {isBlocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-[200] flex items-center justify-center"
          >
            <div className="text-center p-8">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <ShieldAlert className="mx-auto w-24 h-24 text-red-500 mb-6" />
              </motion.div>
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-4xl font-bold text-white mb-4"
              >
                Security Alert
              </motion.h1>
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-slate-300 text-lg max-w-md"
              >
                This action is not permitted. You will be redirected shortly.
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {isBlocked ? null : children}
    </>
  );
};

export default DevToolsBlocker;