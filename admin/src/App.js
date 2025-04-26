import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import AdminPrivateRoute from './components/AdminPrivateRoute';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import AdminSettings from './pages/AdminSettings';
import TransactionManagement from './pages/TransactionManagement';
import GoalManagement from './pages/GoalManagement';
import EducationManagement from './pages/EducationManagement';
import InsightManagement from './pages/InsightManagement';
import BotManagement from './pages/BotManagement';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'chart.js/auto';

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          
          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <AdminPrivateRoute>
                <AdminLayout />
              </AdminPrivateRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="transactions" element={<TransactionManagement />} />
            <Route path="goals" element={<GoalManagement />} />
            <Route path="education" element={<EducationManagement />} />
            <Route path="insights" element={<InsightManagement />} />
            <Route path="bot" element={<BotManagement />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
          </Route>

          {/* Redirect root to admin dashboard */}
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </Router>

      {/* Toast Container for Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
}

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    // Log error to error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Oops! Terjadi Kesalahan</h1>
              <p className="text-gray-600 mb-4">
                Mohon maaf, terjadi kesalahan dalam aplikasi admin. Silakan muat ulang halaman atau hubungi tim teknis jika masalah berlanjut.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Muat Ulang Halaman
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-4 bg-gray-100 rounded-md overflow-auto">
                <pre className="text-xs text-red-600">
                  {this.state.error && this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Performance Monitoring Component
const PerformanceMonitor = ({ children }) => {
  React.useEffect(() => {
    // Monitor page load performance
    if (window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0];
      const metrics = {
        dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcpConnection: navigation.connectEnd - navigation.connectStart,
        serverResponse: navigation.responseEnd - navigation.requestStart,
        domLoad: navigation.domComplete - navigation.domLoading,
        totalLoad: navigation.loadEventEnd - navigation.navigationStart
      };
      console.log('Performance Metrics:', metrics);
    }

    // Monitor memory usage
    if (window.performance && performance.memory) {
      console.log('Memory Usage:', performance.memory);
    }
  }, []);

  return children;
};

// Wrap the App component with ErrorBoundary and PerformanceMonitor
const AppWithWrappers = () => (
  <ErrorBoundary>
    <PerformanceMonitor>
      <App />
    </PerformanceMonitor>
  </ErrorBoundary>
);

export default AppWithWrappers;
