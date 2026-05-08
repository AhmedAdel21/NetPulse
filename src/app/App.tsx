import { useState } from 'react';

import './App.css';
import logo from './logo.png';

export const App = () => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <img src={logo} alt="NetPulse logo" width={48} height={48} />

      <h1>NetPulse Dashboard</h1>
      <p>Network Operations Dashboard</p>
      <p>Network Operations Dashboard</p>
      <button onClick={() => setCount((c) => c + 1)}>Count: {count}</button>
    </div>
  );
};
