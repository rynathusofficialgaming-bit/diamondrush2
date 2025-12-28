import React from 'react';
import { Helmet } from 'react-helmet';
import MinesGame from '@/components/MinesGame';
import { Toaster } from '@/components/ui/toaster';
import DevToolsBlocker from '@/components/DevToolsBlocker';  // <-- Add this

function App() {
  return (
    <DevToolsBlocker>  
      <>
        <Helmet>
          <title>Diamond Mines - Gambling Game</title>
          <meta name="description" content="Play Diamond Mines - Find 3 diamonds to win amazing rewards! Modern sleek gambling game with exciting gameplay." />
        </Helmet>
        <MinesGame />
        <Toaster />
      </>
    </DevToolsBlocker>
  );
}

export default App;
