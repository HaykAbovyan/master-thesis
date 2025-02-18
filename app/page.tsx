import { TypingTest } from "./components/TypingTest";


const Home: React.FC = () => {
  return (
    <main className="text-center">
      <h1 className="text-3xl font-bold mb-4">Typing Speed Test</h1>

      <TypingTest />
    </main>
  );
};

export default Home;
