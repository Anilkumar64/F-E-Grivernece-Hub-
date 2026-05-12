/**
 * Super Admin Dashboard Page
 * Enhanced dashboard with admin creation and testing capabilities
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminCreationForm from '../components/AdminCreationForm.jsx';
import NotificationTestDashboard from '../components/NotificationTestDashboard.jsx';

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchStats();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/stats');
      setStats(response.data);
    } catch {
      setError('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'create-admin', label: 'Create Admin', icon: '👤' },
    { id: 'test-notifications', label: 'Test Notifications', icon: '📧' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'grievances', label: 'Grievances', icon: '📝' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  const renderOverview = () => {
    if (loading) return <div className="loading">Loading statistics...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!stats) return <div className="loading">No data available</div>;

    return (
      <div className="overview-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Total Users</h3>
            <p className="stat-number">{stats.totalUsers || 0}</p>
            <p className="stat-detail">
              {stats.activeUsers || 0} active, {stats.inactiveUsers || 0} inactive
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👤</div>
          <div className="stat-content">
            <h3>Admins</h3>
            <p className="stat-number">{stats.totalAdmins || 0}</p>
            <p className="stat-detail">
              {stats.activeAdmins || 0} active, {stats.inactiveAdmins || 0} inactive
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <h3>Grievances</h3>
            <p className="stat-number">{stats.totalGrievances || 0}</p>
            <p className="stat-detail">
              {stats.pendingGrievances || 0} pending, {stats.resolvedGrievances || 0} resolved
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-content">
            <h3>Departments</h3>
            <p className="stat-number">{stats.totalDepartments || 0}</p>
            <p className="stat-detail">
              Active departments
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📧</div>
          <div className="stat-content">
            <h3>Notifications</h3>
            <p className="stat-number">{stats.totalNotifications || 0}</p>
            <p className="stat-detail">
              {stats.emailNotifications || 0} email, {stats.smsNotifications || 0} SMS
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔐</div>
          <div className="stat-content">
            <h3>Security</h3>
            <p className="stat-number">{stats.securityScore || 0}%</p>
            <p className="stat-detail">
              System security score
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderCreateAdmin = () => {
    return <AdminCreationForm />;
  };

  const renderTestNotifications = () => {
    return <NotificationTestDashboard />;
  };

  const renderUsers = () => {
    return (
      <div className="users-section">
        <h3>User Management</h3>
        <p>User management functionality will be implemented here.</p>
      </div>
    );
  };

  const renderGrievances = () => {
    return (
      <div className="grievances-section">
        <h3>Grievance Management</h3>
        <p>Grievance management functionality will be implemented here.</p>
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="settings-section">
        <h3>System Settings</h3>
        <p>System settings functionality will be implemented here.</p>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'create-admin':
        return renderCreateAdmin();
      case 'test-notifications':
        return renderTestNotifications();
      case 'users':
        return renderUsers();
      case 'grievances':
        return renderGrievances();
      case 'settings':
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="superadmin-dashboard">
      <div className="dashboard-header">
        <h1>Super Admin Dashboard</h1>
        <p>Manage the E-Grievance Portal system</p>
      </div>

      <div className="dashboard-tabs">
        <div className="tab-navigation">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-content">
        {renderContent()}
      </div>

      <style jsx>{`
        .superadmin-dashboard {
          min-height: 100vh;
          background: #f8f9fa;
        }

        .dashboard-header {
          background: white;
          padding: 2rem;
          border-bottom: 1px solid #eee;
          text-align: center;
        }

        .dashboard-header h1 {
          color: #333;
          margin-bottom: 0.5rem;
        }

        .dashboard-header p {
          color: #666;
        }

        .dashboard-tabs {
          background: white;
          border-bottom: 1px solid #eee;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .tab-navigation {
          display: flex;
          overflow-x: auto;
          padding: 0 1rem;
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          border: none;
          background: none;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tab-button:hover {
          background: #f8f9fa;
        }

        .tab-button.active {
          border-bottom-color: #007bff;
          color: #007bff;
        }

        .tab-icon {
          font-size: 1.2rem;
        }

        .tab-label {
          font-weight: 500;
        }

        .dashboard-content {
          padding: 2rem;
        }

        .overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .stat-icon {
          font-size: 2.5rem;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fa;
          border-radius: 50%;
        }

        .stat-content h3 {
          color: #333;
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
        }

        .stat-number {
          font-size: 2rem;
          font-weight: bold;
          color: #007bff;
          margin: 0 0 0.25rem 0;
        }

        .stat-detail {
          color: #666;
          font-size: 0.9rem;
          margin: 0;
        }

        .loading {
          text-align: center;
          padding: 2rem;
          color: #666;
        }

        .error {
          text-align: center;
          padding: 2rem;
          color: #dc3545;
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
        }

        .users-section,
        .grievances-section,
        .settings-section {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .users-section h3,
        .grievances-section h3,
        .settings-section h3 {
          color: #333;
          margin-bottom: 1rem;
        }

        .users-section p,
        .grievances-section p,
        .settings-section p {
          color: #666;
        }

        @media (max-width: 768px) {
          .dashboard-header {
            padding: 1rem;
          }

          .dashboard-content {
            padding: 1rem;
          }

          .overview-grid {
            grid-template-columns: 1fr;
          }

          .tab-navigation {
            padding: 0;
          }

          .tab-button {
            padding: 0.75rem 1rem;
            font-size: 0.9rem;
          }

          .stat-card {
            padding: 1rem;
          }

          .stat-icon {
            font-size: 2rem;
            width: 50px;
            height: 50px;
          }

          .stat-number {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default SuperAdminDashboard;
