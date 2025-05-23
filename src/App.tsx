import React from "react";
import { Provider } from "react-redux";
import { store } from "./store/store";
import WebcamFeeds from "./components/WebcamFeeds";

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-blue-600 text-white p-4 shadow-md">
          <h1 className="text-center d-block ">Facial Recognition App</h1>
        </header>
        <main className="container mx-auto p-4">
          {/* <WebcamFeed /> */}
          <div className="text-center">
            <WebcamFeeds/>
          </div>
        </main>
      </div>
    </Provider>
  );
};

export default App;
