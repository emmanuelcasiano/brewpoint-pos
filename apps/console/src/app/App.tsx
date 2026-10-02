import { Navigate, Route, Routes } from 'react-router';
import { HomePage } from './HomePage';
import { RequireStaff } from './sign-in/RequireStaff';
import { SignInPage } from './sign-in/SignInPage';
import { StaffSessionProvider } from './sign-in/StaffSessionProvider';
import { TwoStepPage } from './sign-in/TwoStepPage';
import { TwoStepSetupPage } from './sign-in/TwoStepSetupPage';

/** The staff console routes. main.tsx puts it inside a BrowserRouter; tests use a MemoryRouter. */
export function App() {
  return (
    <StaffSessionProvider>
      <Routes>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/two-step" element={<TwoStepPage />} />
        <Route path="/two-step/setup" element={<TwoStepSetupPage />} />
        <Route
          path="/"
          element={
            <RequireStaff>
              <HomePage />
            </RequireStaff>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </StaffSessionProvider>
  );
}
