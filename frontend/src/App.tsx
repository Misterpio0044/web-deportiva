import { Button } from "@/components/ui/button"

function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
      <h1 className="text-3xl font-bold text-slate-900">
        Landing Page
      </h1>
      <Button className="bg-green-500 text-white hover:bg-green-600">
        Mi primer botón profesional
      </Button>
    </div>
  )
}

export default App