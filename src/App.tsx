import SimpleCreator from './components/simple-creator'
import './index.css'

function App() {
  console.log("[App] Rendering main component");
  return (
    <div className="h-screen w-screen overflow-hidden bg-black text-white">
      <SimpleCreator />
    </div>
  )
}

export default App
