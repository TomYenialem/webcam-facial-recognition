import React from "react";
import { Provider } from "react-redux";
import { store } from "./store/store";
import WebcamFeed from "./components/WebcamFeed";

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-blue-600 text-white p-4 shadow-md">
          <h1 className="text-2xl font-bold">Facial Recognition App</h1>
        </header>
        <main className="container mx-auto p-4">
          <WebcamFeed />
        </main>
      </div>
    </Provider>
  );
};

export default App;
