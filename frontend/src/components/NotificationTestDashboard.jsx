/**
 * Notification Testing Dashboard
 * Dashboard for testing email and SMS functionality
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const NotificationTestDashboard = () => {
  const [config, setConfig] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testForm, setTestForm] = useState({
    email: '',
    phone: '',
    message: ''
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await axios.get('/api/test/config');
      setConfig(response.data);
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const testEmail = async () => {
    setLoading(true);
    const startTime = Date.now();
    
    try {
      const response = await axios.post('/api/test/email', {
        to: testForm.email || config.email.user
      });
      
      const result = {
        type: 'email',
        success: response.data.success,
        message: response.data.message,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        to: testForm.email || config.email.user
      };
      
      setTestResults(prev => [result, ...prev]);
    } catch (error) {
      const result = {
        type: 'email',
        success: false,
        message: error.response?.data?.message || error.message,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        to: testForm.email || config.email.user
      };
      
      setTestResults(prev => [result, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const testSMS = async () => {
    setLoading(true);
    const startTime = Date.now();
    
    try {
      const response = await axios.post('/api/test/sms', {
        to: testForm.phone
      });
      
      const result = {
        type: 'sms',
        success: response.data.success,
        message: response.data.message,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        to: testForm.phone
      };
      
      setTestResults(prev => [result, ...prev]);
    } catch (error) {
      const result = {
        type: 'sms',
        success: false,
        message: error.response?.data?.message || error.message,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        to: testForm.phone
      };
      
      setTestResults(prev => [result, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const testOTP = async (type) => {
    setLoading(true);
    const startTime = Date.now();
    
    try {
      const response = await axios.post('/api/otp/send-code', {
        email: type === 'email' ? testForm.email : undefined,
        phone: type === 'phone' ? testForm.phone : undefined,
        type: type
      });
      
      const result = {
        type: `otp-${type}`,
        success: response.data.success,
        message: response.data.message,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        to: type === 'email' ? testForm.email : testForm.phone
      };
      
      setTestResults(prev => [result, ...prev]);
    } catch (error) {
      const result = {
        type: `otp-${type}`,
        success: false,
        message: error.response?.data?.message || error.message,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        to: type === 'email' ? testForm.email : testForm.phone
      };
      
      setTestResults(prev => [result, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const getStatusColor = (success) => {
    return success ? '#28a745' : '#dc3545';
  };

  const getStatusIcon = (success) => {
    return success ? '✓' : '✗';
  };

  if (!config) {
    return <div className="loading">Loading configuration...</div>;
  }

  return (
    <div className="notification-test-dashboard">
      <div className="dashboard-header">
        <h2>Notification Testing Dashboard</h2>
        <p>Test email and SMS configuration for the E-Grievance Portal</p>
      </div>

      {/* Configuration Status */}
      <div className="config-status">
        <h3>Current Configuration</h3>
        <div className="config-grid">
          <div className="config-item">
            <h4>Email Service</h4>
            <div className="status-indicator">
              <span className={`status ${config.email.enabled ? 'enabled' : 'disabled'}`}>
                {config.email.enabled ? '✓ Enabled' : '✗ Disabled'}
              </span>
            </div>
            <div className="config-details">
              <p><strong>Host:</strong> {config.email.host}</p>
              <p><strong>Port:</strong> {config.email.port}</p>
              <p><strong>User:</strong> {config.email.user}</p>
              <p><strong>From:</strong> {config.email.from}</p>
            </div>
          </div>

          <div className="config-item">
            <h4>SMS Service</h4>
            <div className="status-indicator">
              <span className={`status ${config.sms.enabled ? 'enabled' : 'disabled'}`}>
                {config.sms.enabled ? '✓ Enabled' : '✗ Disabled'}
              </span>
            </div>
            <div className="config-details">
              <p><strong>Account SID:</strong> {config.sms.accountSid}</p>
              <p><strong>Phone Number:</strong> {config.sms.phoneNumber}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Test Form */}
      <div className="test-form">
        <h3>Test Notifications</h3>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="testEmail">Email Address</label>
            <input
              type="email"
              id="testEmail"
              value={testForm.email}
              onChange={(e) => setTestForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter email to test"
            />
          </div>

          <div className="form-group">
            <label htmlFor="testPhone">Phone Number</label>
            <input
              type="tel"
              id="testPhone"
              value={testForm.phone}
              onChange={(e) => setTestForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+1234567890"
            />
          </div>
        </div>

        <div className="test-buttons">
          <button
            onClick={testEmail}
            disabled={loading || !config.email.enabled}
            className="btn btn-email"
          >
            {loading ? 'Testing...' : 'Test Email'}
          </button>

          <button
            onClick={testSMS}
            disabled={loading || !config.sms.enabled}
            className="btn btn-sms"
          >
            {loading ? 'Testing...' : 'Test SMS'}
          </button>

          <button
            onClick={() => testOTP('email')}
            disabled={loading || !config.email.enabled || !testForm.email}
            className="btn btn-otp-email"
          >
            {loading ? 'Testing...' : 'Test Email OTP'}
          </button>

          <button
            onClick={() => testOTP('phone')}
            disabled={loading || !config.sms.enabled || !testForm.phone}
            className="btn btn-otp-sms"
          >
            {loading ? 'Testing...' : 'Test SMS OTP'}
          </button>
        </div>
      </div>

      {/* Test Results */}
      <div className="test-results">
        <div className="results-header">
          <h3>Test Results</h3>
          <button onClick={clearResults} className="btn btn-clear">
            Clear Results
          </button>
        </div>

        {testResults.length === 0 ? (
          <div className="no-results">
            <p>No tests performed yet. Run a test to see results.</p>
          </div>
        ) : (
          <div className="results-list">
            {testResults.map((result, index) => (
              <div key={index} className="result-item">
                <div className="result-header">
                  <span className="result-type">{result.type.toUpperCase()}</span>
                  <span 
                    className="result-status"
                    style={{ color: getStatusColor(result.success) }}
                  >
                    {getStatusIcon(result.success)} {result.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                <div className="result-details">
                  <p><strong>To:</strong> {result.to}</p>
                  <p><strong>Message:</strong> {result.message}</p>
                  <p><strong>Duration:</strong> {result.duration}ms</p>
                  <p><strong>Timestamp:</strong> {new Date(result.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configuration Help */}
      <div className="config-help">
        <h3>Configuration Help</h3>
        <div className="help-content">
          <div className="help-section">
            <h4>Email Setup</h4>
            <ul>
              <li>Use Gmail for testing: Enable 2FA and generate App Password</li>
              <li>Use SendGrid for production: Create account and get API key</li>
              <li>Check EMAIL_ENABLED=true in environment variables</li>
              <li>Verify EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS</li>
            </ul>
          </div>

          <div className="help-section">
            <h4>SMS Setup</h4>
            <ul>
              <li>Create Twilio account and get phone number</li>
              <li>Set TWILIO_ENABLED=true in environment variables</li>
              <li>Configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN</li>
              <li>Phone numbers must be in E.164 format: +1234567890</li>
            </ul>
          </div>

          <div className="help-section">
            <h4>Troubleshooting</h4>
            <ul>
              <li>Check server logs: `docker logs e-griverence-v2-backend-1`</li>
              <li>Verify network connectivity to SMTP/SMS services</li>
              <li>Ensure credentials are correct and properly escaped</li>
              <li>Test with different email/phone numbers</li>
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        .notification-test-dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          background: #f8f9fa;
          min-height: 100vh;
        }

        .dashboard-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .dashboard-header h2 {
          color: #333;
          margin-bottom: 0.5rem;
        }

        .dashboard-header p {
          color: #666;
        }

        .config-status {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
        }

        .config-status h3 {
          color: #333;
          margin-bottom: 1rem;
        }

        .config-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .config-item h4 {
          color: #333;
          margin-bottom: 0.5rem;
        }

        .status-indicator {
          margin-bottom: 1rem;
        }

        .status.enabled {
          color: #28a745;
          font-weight: 600;
        }

        .status.disabled {
          color: #dc3545;
          font-weight: 600;
        }

        .config-details p {
          margin: 0.25rem 0;
          font-size: 0.9rem;
          color: #666;
        }

        .test-form {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
        }

        .test-form h3 {
          color: #333;
          margin-bottom: 1rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          font-weight: 600;
          color: #333;
          margin-bottom: 0.5rem;
        }

        .form-group input {
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }

        .test-buttons {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-email {
          background: #007bff;
          color: white;
        }

        .btn-email:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-sms {
          background: #28a745;
          color: white;
        }

        .btn-sms:hover:not(:disabled) {
          background: #1e7e34;
        }

        .btn-otp-email {
          background: #17a2b8;
          color: white;
        }

        .btn-otp-email:hover:not(:disabled) {
          background: #138496;
        }

        .btn-otp-sms {
          background: #fd7e14;
          color: white;
        }

        .btn-otp-sms:hover:not(:disabled) {
          background: #e8590c;
        }

        .btn-clear {
          background: #6c757d;
          color: white;
        }

        .btn-clear:hover {
          background: #545b62;
        }

        .test-results {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .results-header h3 {
          color: #333;
        }

        .no-results {
          text-align: center;
          color: #666;
          padding: 2rem;
        }

        .results-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .result-item {
          padding: 1rem;
          border: 1px solid #eee;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .result-type {
          font-weight: 600;
          color: #333;
        }

        .result-status {
          font-weight: 600;
        }

        .result-details p {
          margin: 0.25rem 0;
          font-size: 0.9rem;
          color: #666;
        }

        .config-help {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .config-help h3 {
          color: #333;
          margin-bottom: 1rem;
        }

        .help-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .help-section h4 {
          color: #333;
          margin-bottom: 0.5rem;
        }

        .help-section ul {
          margin: 0;
          padding-left: 1.5rem;
        }

        .help-section li {
          margin-bottom: 0.25rem;
          color: #666;
        }

        .loading {
          text-align: center;
          padding: 2rem;
          color: #666;
        }

        @media (max-width: 768px) {
          .notification-test-dashboard {
            padding: 1rem;
          }

          .test-buttons {
            flex-direction: column;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .help-content {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default NotificationTestDashboard;
