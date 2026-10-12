import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { LoginView, MainView, NotFoundView } from "@/views"
import { createTheme, ThemeProvider } from "@mui/material"
import { useEffect } from "react"
import { env_name } from "@/env"
import "./App.css"

// Anything but production is tinted light red (the tone of the chips) so it is never mistaken for the real data.
const DEV_BACKGROUND = "#ffb4b8"
const DEV_PAPER = "#ffebee"

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

  useEffect(() => {
    if (!env_name) return

    document.body.style.backgroundColor = DEV_BACKGROUND
    document.title = `Expenses · ${env_name}`
  }, [])

  const theme = createTheme({
    ...(env_name ? {
      palette: { background: { default: DEV_BACKGROUND, paper: DEV_PAPER } },
      // The sticky header of the table (the name and chips of each source) takes `background.default` by
      // default, which would be the page colour instead of the card's one.
      components: { MuiTableCell: { styleOverrides: { stickyHeader: { backgroundColor: DEV_PAPER } } } },
    } : {}),
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
