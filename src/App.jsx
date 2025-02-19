import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { LoginView, MainView, NotFoundView } from "@/views"

function App() {
  const router = createBrowserRouter([
    {
      path: "",
      element: <MainView />
    },
    {
      path: "login",
      element: <LoginView />
    },
    {
      path: "*",
      element: <NotFoundView />
    }
  ])

  return <RouterProvider router={router} />
}

export default App
