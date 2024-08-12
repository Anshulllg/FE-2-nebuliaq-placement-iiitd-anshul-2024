import React from 'react';
import './App.css';
import ServiceGraph from './components/ServiceGraph';

function App() {
  return (
    <div className="w-screen h-screen">
      {/* <h1 className="text-xl font-bold ">Service Graph</h1> */}
      <ServiceGraph />
    </div>
  );
}

export default App;
