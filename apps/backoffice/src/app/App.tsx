import { Navigate, Route, Routes } from 'react-router';
import { HomePage } from './HomePage';
import { ForgotPasswordPage } from './sign-in/ForgotPasswordPage';
import { RequireSignIn } from './sign-in/RequireSignIn';
import { SessionProvider } from './sign-in/SessionProvider';
import { SetPasswordPage } from './sign-in/SetPasswordPage';
import { SignInPage } from './sign-in/SignInPage';

/** The back-office routes. main.tsx puts it inside a BrowserRouter; tests use a MemoryRouter. */
export function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route
          path="/"
          element={
            <RequireSignIn>
              <HomePage />
            </RequireSignIn>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionProvider>
  );
}
