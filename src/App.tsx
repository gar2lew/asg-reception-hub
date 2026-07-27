import { RouterProvider } from 'react-router-dom';
import { router } from './app/Router';
import { ErrorBoundary } from './components/ErrorBoundary';
import './design-system/globals.css';
export default function App() {
  return <ErrorBoundary><RouterProvider router={router} /></ErrorBoundary>;
}
