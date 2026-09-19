import { BrowserRouter, Route, Routes } from 'react-router-dom'
import BoardPage from './pages/BoardPage'

// Router is trivial in Module 01 (one page). It is here so later modules can
// add /login, /tasks/:id, etc. without restructuring.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BoardPage />} />
      </Routes>
    </BrowserRouter>
  )
}
