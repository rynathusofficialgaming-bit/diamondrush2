// Simple Web Audio API synthesizer for game sound effects
// This avoids the need for external assets and ensures sounds work in all environments

const AudioContext = window.AudioContext || window.webkitAudioContext;
const ctx = new AudioContext();

const createOscillator = (type, freq, duration, startTime = 0, vol = 0.1) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
  
  gain.gain.setValueAtTime(vol, ctx.currentTime + startTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime + startTime);
  osc.stop(ctx.currentTime + startTime + duration);
};

export const playSound = (type) => {
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  switch (type) {
    case 'click':
      createOscillator('sine', 800, 0.1, 0, 0.05);
      break;
      
    case 'diamond':
      // Sparkling high chime
      createOscillator('sine', 1200, 0.3, 0, 0.1);
      createOscillator('triangle', 2400, 0.4, 0.05, 0.05);
      break;
      
    case 'bomb':
      // Low thud/explosion
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.3);
      
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      break;
      
    case 'win':
      // Major arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major
      notes.forEach((freq, i) => {
        createOscillator('sine', freq, 0.3, i * 0.1, 0.1);
      });
      break;
      
    case 'lose':
      // Dissonant/Descending
      createOscillator('sawtooth', 300, 0.4, 0, 0.1);
      createOscillator('sawtooth', 290, 0.4, 0.1, 0.1);
      break;
      
    case 'lock':
      createOscillator('square', 200, 0.1, 0, 0.05);
      break;
      
    case 'unlock':
      createOscillator('sine', 600, 0.2, 0, 0.1);
      createOscillator('sine', 800, 0.4, 0.1, 0.1);
      break;
      
    default:
      break;
  }
};