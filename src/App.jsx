import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { LoginView, MainView, NotFoundView } from "@/views"
import { createTheme, ThemeProvider } from "@mui/material"

function App({ children }) {
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

  const theme = createTheme({
    // palette: {
    //   primary: {
    //     main: '#f0f0f0', // Primary color
    //   },
    //   secondary: {
    //     main: '#dc004e', // Secondary color
    //   },
    // },
    typography: {
      fontFamily: 'Roboto, Arial, sans-serif',
    },
  });

  return <ThemeProvider theme={theme}>
    <RouterProvider router={router} />
  </ThemeProvider>
}

export default App
