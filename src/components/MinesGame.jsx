import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Diamond, Bomb, Lock, Terminal, ShieldAlert, Sparkles, XCircle, LogOut, ChevronRight, Play, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { gameConfig } from '@/config/gameConfig';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/sound';
import { supabase } from '@/lib/supabaseClient';

// === DISCORD WEBHOOK (REPLACE WITH YOURS) ===
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1454280021886894193/JGLhVf_qzMI7recrICBfMYbHPP3PdBsBZvsPa5wmZ4IzLSXFQtq4ptyWzoDZ-6U3xZdH';

// Log code usage to Discord
const logCodeUsageToDiscord = async (code, ip = 'Unknown', userAgent = 'Unknown') => {
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes('YOUR_DISCORD_WEBHOOK_URL_HERE')) {
    return;
  }
  const timestamp = new Date().toISOString();
  const embed = {
    title: "🔑 One-Time Code Redeemed",
    color: 0x00FFFF,
    fields: [
      { name: "Code", value: `\`${code.toUpperCase()}\``, inline: true },
      { name: "Timestamp", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
      { name: "IP Address", value: ip || 'Unknown', inline: false },
      { name: "User Agent", value: userAgent.substring(0, 100) + (userAgent.length > 100 ? '...' : ''), inline: false }
    ],
    footer: { text: "Diamond Mines Access Log" },
    timestamp
  };
  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
  } catch (err) {
    console.error('Discord webhook failed:', err);
  }
};

// Generate grid
const generateGrid = () => {
  const totalCells = gameConfig.gridSize.rows * gameConfig.gridSize.columns;
  return Array(totalCells).fill(null).map(() =>
    Math.random() * 100 < gameConfig.odds.diamond ? 'diamond' : 'bomb'
  );
};

const MinesGame = () => {
  const [appState, setAppState] = useState('checking');
  const [accessCode, setAccessCode] = useState('');
  const [grid, setGrid] = useState([]);
  const [revealedCells, setRevealedCells] = useState([]);
  const [diamondCount, setDiamondCount] = useState(0);
  const [gameResult, setGameResult] = useState(null);
  const [wonReward, setWonReward] = useState(null); // Random prize on win

  // Persisted failed attempts to prevent refresh exploit
  const [failedAttempts, setFailedAttempts] = useState(() => {
    const stored = localStorage.getItem('mines_failed_attempts');
    return stored ? parseInt(stored, 10) : 0;
  });

  // Sync failed attempts to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('mines_failed_attempts', failedAttempts.toString());
  }, [failedAttempts]);

  // Initial app state check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!gameConfig.isEnabled) {
        setAppState('maintenance');
      } else {
        const unlocked = localStorage.getItem('mines_unlocked');
        setAppState(unlocked ? 'menu' : 'locked');
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleUnlock = async (e) => {
    e.preventDefault();

    const normalizedInput = accessCode.trim().toLowerCase();
    if (!normalizedInput) {
      toast({
        title: "ACCESS DENIED",
        description: "Please enter a code.",
        variant: "destructive"
      });
      return;
    }

    // Check if code exists in your gameConfig.timeCodes
    const validCode = gameConfig.timeCodes.some(tc => tc.code.toLowerCase() === normalizedInput);
    if (!validCode) {
      playSound('lock');
      toast({
        title: "ACCESS DENIED",
        description: "Invalid security code.",
        variant: "destructive"
      });
      return;
    }

    // Check if already used in Supabase
    const { data: existing } = await supabase
      .from('used_codes')
      .select('code')
      .eq('code', normalizedInput)
      .maybeSingle();

    if (existing) {
      playSound('lock');
      toast({
        title: "CODE EXPIRED",
        description: "This one-time code has already been redeemed.",
        variant: "destructive"
      });
      return;
    }

    // Get IP for logging
    let userIP = 'Unknown';
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      userIP = data.ip || 'Unknown';
    } catch {}

    // Mark code as used
    const { error: insertError } = await supabase
      .from('used_codes')
      .insert({
        code: normalizedInput,
        ip_address: userIP,
        user_agent: navigator.userAgent.substring(0, 500)
      });

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      toast({
        title: "ERROR",
        description: "Failed to redeem code. Try again.",
        variant: "destructive"
      });
      return;
    }

    // Optional: Discord log
    await logCodeUsageToDiscord(normalizedInput, userIP, navigator.userAgent);

    // Success!
    playSound('unlock');
    toast({
      title: "ACCESS GRANTED",
      description: "Welcome to the Diamond Protocol.",
      className: "bg-cyan-950/90 border-cyan-500 text-cyan-50",
    });

    localStorage.setItem('mines_unlocked', 'true');
    // Reset failed attempts for fresh session
    setFailedAttempts(0);
    setAccessCode('');
    setAppState('menu');
  };

  const handleStartGame = () => {
    playSound('click');
    setGrid(generateGrid());
    setRevealedCells([]);
    setDiamondCount(0);
    setGameResult(null);
    setWonReward(null);
    setAppState('playing');
  };

  const handleLogout = () => {
    playSound('click');
    localStorage.removeItem('mines_unlocked');
    localStorage.removeItem('mines_failed_attempts');
    setFailedAttempts(0);
    setAccessCode('');
    setAppState('locked');
  };

  const handleSystemLockout = () => {
    playSound('lock');
    localStorage.removeItem('mines_unlocked');
    localStorage.removeItem('mines_failed_attempts');
    setFailedAttempts(0);
    setAppState('locked');
    toast({
      title: "SYSTEM LOCKOUT",
      description: `Max attempts reached. Session terminated.`,
      variant: "destructive"
    });
  };

  const revealCell = (index) => {
    if (appState !== 'playing' || revealedCells.includes(index) || gameResult) return;

    setRevealedCells(prev => [...prev, index]);

    if (grid[index] === 'diamond') {
      const newCount = diamondCount + 1;
      setDiamondCount(newCount);
      playSound('diamond');

      if (newCount === 3) {
        // Random reward
        const randomIdx = Math.floor(Math.random() * gameConfig.rewards.length);
        setWonReward(gameConfig.rewards[randomIdx]);
        setGameResult('won');
        setFailedAttempts(0); // Reset on win
        setTimeout(() => {
          playSound('win');
          setAppState('result');
        }, 1000);
      }
    } else {
      setGameResult('lost');
      playSound('bomb');
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      const bombs = grid.map((c, i) => c === 'bomb' ? i : -1).filter(i => i !== -1);

      setTimeout(() => {
        setRevealedCells(prev => Array.from(new Set([...prev, ...bombs])));
        setTimeout(() => {
          playSound('lose');
          if (newAttempts >= gameConfig.maxFailedAttempts) {
            handleSystemLockout();
          } else {
            setAppState('result');
          }
        }, 1500);
      }, 200);
    }
  };

  const BackgroundEffects = () => (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse delay-1000" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
    </div>
  );

  if (appState === 'checking') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-mono text-cyan-500">
        <BackgroundEffects />
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="mb-8 relative">
          <div className="w-16 h-16 border-4 border-cyan-900 rounded-full" />
          <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-cyan-400 rounded-full" />
        </motion.div>
        <motion.p className="tracking-[0.5em] text-xs font-bold">
          INITIALIZING SYSTEM...
        </motion.p>
      </div>
    );
  }

  if (appState === 'maintenance') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden p-6">
        <BackgroundEffects />
        <motion.div className="z-10 max-w-md w-full bg-slate-900/50 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8 text-center">
          <ShieldAlert className="w-20 h-20 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-red-500 mb-2">SYSTEM LOCKED</h1>
          <p className="text-slate-400">{gameConfig.disabledMessage}</p>
        </motion.div>
      </div>
    );
  }

  if (appState === 'locked') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden p-6">
        <BackgroundEffects />
        <motion.div className="z-10 max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <Lock className="w-12 h-12 text-cyan-400 mx-auto mb-8" />
          <h2 className="text-3xl font-bold text-center text-white mb-2">Security Check</h2>
          <p className="text-center text-slate-400 mb-8">
            Enter your <span className="text-cyan-400 font-bold">one-time</span> code.
          </p>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <Terminal className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input
                type="text"
                placeholder="ENTER CODE..."
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                className="pl-10 bg-slate-950 border-slate-800 text-cyan-400 font-mono tracking-widest text-center h-12 uppercase"
              />
            </div>
            <Button type="submit" className="w-full h-12 bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
              AUTHENTICATE <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (appState === 'result') {
    const isWin = gameResult === 'won';
    const attemptsLeft = gameConfig.maxFailedAttempts - failedAttempts;
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden p-6">
        <BackgroundEffects />
        <motion.div className="z-10 max-w-md w-full text-center">
          <div className="mb-6 relative inline-block">
            {isWin ? <Sparkles className="w-32 h-32 text-cyan-300" /> : <XCircle className="w-32 h-32 text-red-500" />}
          </div>
          <h1 className={cn("text-5xl font-black mb-4", isWin ? "text-cyan-400" : "text-red-500")}>
            {isWin ? "JACKPOT!" : "BUSTED"}
          </h1>
          <div className="text-slate-400 text-lg mb-8">
            {isWin ? (
              <div className="space-y-4">
                <p className="text-2xl font-bold text-cyan-300">Congratulations!</p>
                <p className="text-3xl font-black text-yellow-400">
                  {wonReward.amount} {wonReward.prize}
                </p>
              </div>
            ) : (
              <div>
                <p>You hit a mine.</p>
                <p className="text-sm text-red-400 mt-2 font-mono">
                  Warning: {attemptsLeft} Attempt{attemptsLeft !== 1 ? 's' : ''} Remaining
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            {isWin && (
              <Button asChild className="h-12 bg-indigo-600 hover:bg-indigo-500 text-white text-lg font-bold">
                <a href={gameConfig.discordClaimLink} target="_blank" rel="noopener noreferrer">
                  Claim Your {wonReward.prize} <ChevronRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            )}
            {!isWin && <Button onClick={handleStartGame} className="h-12 bg-cyan-600 hover:bg-cyan-500">Try Again</Button>}
            <Button onClick={handleLogout} variant="ghost" className="text-slate-500 hover:text-white">
              Exit to Security Check
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Menu + Playing
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <BackgroundEffects />
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          <span className="text-xs font-mono text-cyan-500 tracking-widest">SECURE_NET</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-red-400 gap-2">
          <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">DISCONNECT</span>
        </Button>
      </div>
      <div className="relative z-10 w-full max-w-7xl grid lg:grid-cols-[1fr_350px] gap-8 items-start">
        <div className="flex flex-col items-center">
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-cyan-400">
              DIAMOND MINES
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Find 3 diamonds to win a random prize!</p>
          </div>
          <div className="relative bg-slate-900/40 backdrop-blur-md p-6 md:p-10 rounded-3xl border border-white/5 shadow-2xl w-full max-w-[650px]">
            {appState === 'menu' ? (
              <div className="aspect-square flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                <Play className="w-24 h-24 text-cyan-400 mb-6" />
                <h3 className="text-xl font-bold text-white mb-2">Ready?</h3>
                <p className="text-slate-400 mb-8 text-sm">Grid generation requires credits.</p>
                <Button onClick={handleStartGame} className="w-full max-w-[200px] h-12 text-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold">
                  START ROUND
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 w-full aspect-square" style={{ gridTemplateColumns: `repeat(${gameConfig.gridSize.columns}, 1fr)` }}>
                {grid.map((cellType, index) => {
                  const revealed = revealedCells.includes(index);
                  const isDiamond = cellType === 'diamond';
                  const exploded = revealed && !isDiamond && gameResult === 'lost';
                  return (
                    <motion.button
                      key={index}
                      onClick={() => revealCell(index)}
                      disabled={revealed || !!gameResult}
                      className={cn(
                        "relative rounded-xl border-2 overflow-hidden group",
                        revealed
                          ? isDiamond
                            ? "bg-cyan-500/20 border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                            : "bg-red-500/20 border-red-500/50"
                          : "bg-slate-800/80 border-slate-700 hover:border-cyan-500/50"
                      )}
                    >
                      <AnimatePresence>
                        {revealed && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 flex items-center justify-center">
                            {isDiamond ? <Diamond className="w-1/2 h-1/2 text-cyan-300" fill="currentColor" /> : <Bomb className={cn("w-1/2 h-1/2 text-red-500", exploded && "animate-bounce")} />}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {/* Sidebar */}
        <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 p-6 space-y-6 lg:mt-[168px]">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Current Session</h3>
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Diamond className="w-10 h-10 text-cyan-400" />
                  <span className="text-sm font-semibold text-slate-300">Found</span>
                </div>
                <span className="text-2xl font-black text-white">{diamondCount}/3</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" /> Possible Rewards
            </h3>
            <div className="space-y-3">
              {gameConfig.rewards.map((reward, i) => (
                <div key={i} className="p-4 rounded-xl bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold text-white">{reward.amount}</div>
                      <div className="text-sm text-slate-300">{reward.prize}</div>
                    </div>
                    <Sparkles className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-4 text-center italic">One random prize on jackpot!</p>
          </div>
          <div className="pt-6 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Probability</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-800 text-center">
                <div className="text-2xl font-bold text-cyan-400">{gameConfig.odds.diamond}%</div>
                <div className="text-xs text-slate-500 uppercase mt-1">Success Rate</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-800 text-center">
                <div className="text-2xl font-bold text-red-400">{gameConfig.odds.bomb}%</div>
                <div className="text-xs text-slate-500 uppercase mt-1">Risk</div>
              </div>
            </div>
          </div>
          <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-900/40 border border-indigo-500/20 text-center">
            <p className="text-xs text-indigo-300 mb-2 font-bold uppercase">Pro Tip</p>
            <p className="text-sm text-slate-300 italic">"Patience is the miner's best tool."</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MinesGame;
